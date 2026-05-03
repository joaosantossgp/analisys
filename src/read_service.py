from __future__ import annotations

import functools
import io
import zipfile
from collections import defaultdict
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any

import pandas as pd
from sqlalchemy import bindparam, inspect, text

from src.company_catalog import (
    CompanyCatalogEntry,
    CompanyCatalogUnavailableError,
    CompanyCatalogService,
)
from src.contracts import (
    CompanyDirectoryAppliedFilters,
    CompanyDirectoryPage,
    CompanyDirectoryPagination,
    CompanyFiltersDTO,
    CompanyInfoDTO,
    CompanySectorFilterOption,
    CompanySearchResult,
    CompanySuggestionDTO,
    HealthSnapshot,
    KPIBundle,
    RankedRefreshQueueItem,
    RankedRefreshQueueResult,
    RefreshDispatchDTO,
    RefreshPolicy,
    RefreshRequest,
    RefreshStatusDTO,
    SectorCompanyMetricDTO,
    SectorDetailDTO,
    SectorDirectoryDTO,
    SectorDirectoryItemDTO,
    SectorSnapshotDTO,
    SectorYearOverviewDTO,
    StatementMatrix,
    StatementSummaryDTO,
    SummaryBlockDTO,
    TabularData,
)
from src.refresh_jobs import (
    REFRESH_STAGE_ORDER,
    REFRESH_STAGE_WEIGHTS,
    RefreshJobRepository,
    ensure_refresh_runtime_tables_for_connection,
)
from src.refresh_service import HeadlessRefreshService
from src.statement_summary import build_general_summary_blocks
from src.db import build_engine
from src.excel_exporter import ExcelExporter, build_excel_filename
from src.kpi_engine import compute_all_kpis, compute_quarterly_kpis
from src.query_layer import CVMQueryLayer
from src.sector_taxonomy import canonical_sector_name, sector_slugify
from src.settings import AppSettings, get_settings

EXPORT_STATEMENT_TYPES = ("DRE", "BPA", "BPP", "DFC", "DVA", "DMPL")

# Top-10 B3 companies by approximate market cap, ordered largest-first.
# cd_cvm values sourced from src/ticker_map.py.
# Update this list when B3 composition changes significantly (roughly annual).
POPULARES_CVM_IDS: tuple[int, ...] = (
    9512,   # PETR4  – PETROBRAS
    4170,   # VALE3  – VALE
    19348,  # ITUB4  – ITAÚ UNIBANCO
    906,    # BBDC4  – BANCO BRADESCO
    1023,   # BBAS3  – BANCO DO BRASIL
    22616,  # BPAC11 – BTG PACTUAL
    23264,  # ABEV3  – AMBEV
    5410,   # WEGE3  – WEG
    24813,  # RENT3  – LOCALIZA
    21610,  # B3SA3  – B3
)


class RefreshAlreadyActiveError(RuntimeError):
    """Raised when an internal on-demand refresh is already active."""


def _parse_years(raw_years: str | None) -> tuple[int, ...]:
    if not raw_years:
        return ()
    if isinstance(raw_years, (list, tuple)):
        return tuple(sorted({int(value) for value in raw_years}))
    result = []
    for value in str(raw_years).split(","):
        value = value.strip()
        if not value:
            continue
        try:
            result.append(int(value))
        except ValueError:
            continue
    return tuple(sorted(set(result)))


class CVMReadService:
    REQUIRED_PACKAGE_STATEMENTS = ("BPA", "BPP", "DRE", "DFC")
    BASE_HEALTH_OK_THRESHOLD = 90.0
    BASE_HEALTH_CRITICAL_THRESHOLD = 70.0
    THROUGHPUT_WINDOW_HOURS = 24
    THROUGHPUT_MIN_SUCCESS_SAMPLES = 3
    RANKED_REFRESH_QUEUE_WINDOW_MINUTES = 10
    PRIORITIZED_BACKLOG_STALE_HOURS = 12
    ACTIVE_REFRESH_STATUSES = {"queued", "running"}
    REFRESH_ESTIMATE_DEFAULT_TOTAL_SECONDS = 18 * 60
    REFRESH_ESTIMATE_PROGRESS_FLOOR = 12.0
    REFRESH_ESTIMATE_PROGRESS_CEILING = 92.0
    REFRESH_ESTIMATE_PROGRESS_CAP = 96.0
    REFRESH_QUEUE_PROGRESS_BASE = 14.0
    REFRESH_QUEUE_PROGRESS_STEP = 4.0
    REFRESH_QUEUE_POSITION_STEP_SECONDS = 2 * 60
    REFRESH_RUNNING_PROGRESS_CAP = 88.0
    REFRESH_RUNNING_STALL_SECONDS = 3 * 60
    REFRESH_QUEUE_STALL_SECONDS = 12 * 60

    def __init__(self, settings: AppSettings | None = None):
        self.settings = settings or get_settings()
        self.engine = build_engine(self.settings)
        self.query_layer = CVMQueryLayer(engine=self.engine)
        self.refresh_job_repository = RefreshJobRepository(self.engine)
        self._company_catalog = None
        self._operational_service = None
        self._refresh_service = None

    @property
    def operational_service(self):
        if self._operational_service is None:
            from desktop.services import IntelligentSelectorService
            self._operational_service = IntelligentSelectorService(settings=self.settings)
        return self._operational_service

    @property
    def refresh_service(self) -> HeadlessRefreshService:
        if self._refresh_service is None:
            self._refresh_service = HeadlessRefreshService(settings=self.settings)
        return self._refresh_service

    @property
    def company_catalog(self) -> CompanyCatalogService:
        if self._company_catalog is None:
            self._company_catalog = CompanyCatalogService(
                timeout=self.settings.company_list_timeout
            )
        return self._company_catalog

    def search_companies(self, search: str = "") -> list[CompanySearchResult]:
        df = self.query_layer.get_companies(search)
        return self._build_company_results(df)

    def search_companies_df(self, search: str = "") -> pd.DataFrame:
        rows = [row.to_dict() for row in self.search_companies(search)]
        return pd.DataFrame(rows)

    def get_company_info(
        self,
        cd_cvm: int,
        *,
        allow_catalog_lookup: bool = True,
    ) -> CompanyInfoDTO | None:
        payload = self.query_layer.get_company_info_with_read_model_state(cd_cvm)
        if payload:
            return self._apply_company_read_model_state(
                self._build_company_info_dto(payload, default_cd_cvm=cd_cvm),
                payload,
            )

        if not allow_catalog_lookup:
            return None

        catalog_entry = self.company_catalog.lookup_company(cd_cvm)
        if catalog_entry is None:
            return None
        return self._with_company_read_model_state(
            self._build_company_info_dto(
                self._company_catalog_payload(catalog_entry),
                default_cd_cvm=cd_cvm,
            )
        )

    def get_company_info_dict(self, cd_cvm: int) -> dict[str, Any]:
        info = self.get_company_info(cd_cvm)
        return info.to_dict() if info else {}

    @functools.lru_cache(maxsize=10)
    def get_available_years(self, cd_cvm: int) -> list[int]:
        return self.query_layer.get_available_years(cd_cvm)

    def get_available_statements(self, cd_cvm: int) -> list[str]:
        return self.query_layer.get_available_statements(cd_cvm)

    @staticmethod
    def _company_catalog_payload(entry: CompanyCatalogEntry) -> dict[str, Any]:
        return {
            "cd_cvm": int(entry.cd_cvm),
            "company_name": entry.company_name,
            "nome_comercial": entry.nome_comercial,
            "cnpj": entry.cnpj,
            "setor_cvm": entry.setor_cvm,
            "setor_analitico": None,
            "company_type": "comercial",
            "ticker_b3": entry.ticker_b3,
        }

    @staticmethod
    def _build_company_info_dto(
        payload: dict[str, Any],
        *,
        default_cd_cvm: int,
    ) -> CompanyInfoDTO:
        sector_name = canonical_sector_name(
            payload.get("setor_analitico"),
            payload.get("setor_cvm"),
        )
        company_name = str(payload.get("company_name") or "").strip() or f"CVM_{default_cd_cvm}"
        company_type = str(payload.get("company_type") or "comercial").strip() or "comercial"
        return CompanyInfoDTO(
            cd_cvm=int(payload.get("cd_cvm") or default_cd_cvm),
            company_name=company_name,
            nome_comercial=payload.get("nome_comercial"),
            cnpj=payload.get("cnpj"),
            setor_cvm=payload.get("setor_cvm"),
            setor_analitico=payload.get("setor_analitico"),
            sector_name=sector_name,
            sector_slug=sector_slugify(sector_name),
            company_type=company_type,
            ticker_b3=payload.get("ticker_b3"),
        )

    def _with_company_read_model_state(self, dto: CompanyInfoDTO) -> CompanyInfoDTO:
        state = self._load_company_read_model_state_map([dto.cd_cvm]).get(
            int(dto.cd_cvm),
            {},
        )
        return self._apply_company_read_model_state(dto, state)

    def _apply_company_read_model_state(
        self,
        dto: CompanyInfoDTO,
        state: dict[str, Any],
    ) -> CompanyInfoDTO:
        readable_years_count = int(state.get("readable_years_count") or 0)
        latest_readable_year = (
            int(state["latest_readable_year"])
            if state.get("latest_readable_year") is not None
            else None
        )
        read_availability = self._build_read_availability_summary(
            has_readable_current_data=bool(state.get("has_readable_current_data")),
            readable_years_count=readable_years_count,
            latest_readable_year=latest_readable_year,
        )
        return replace(
            dto,
            read_model_updated_at=state.get("read_model_updated_at"),
            has_readable_current_data=bool(state.get("has_readable_current_data")),
            readable_years_count=readable_years_count,
            latest_readable_year=latest_readable_year,
            read_availability_code=read_availability["code"],
            read_availability_message=read_availability["message"],
        )

    def _ensure_company_catalog_metadata(self, cd_cvm: int) -> bool:
        if self.query_layer.get_company_info(cd_cvm):
            return False

        catalog_entry = self.company_catalog.lookup_company(cd_cvm)
        if catalog_entry is None:
            return False

        now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO companies (
                        cd_cvm,
                        company_name,
                        nome_comercial,
                        cnpj,
                        setor_cvm,
                        company_type,
                        ticker_b3,
                        is_active,
                        updated_at
                    ) VALUES (
                        :cd_cvm,
                        :company_name,
                        :nome_comercial,
                        :cnpj,
                        :setor_cvm,
                        :company_type,
                        :ticker_b3,
                        :is_active,
                        :updated_at
                    )
                    ON CONFLICT(cd_cvm) DO UPDATE SET
                        company_name = excluded.company_name,
                        nome_comercial = COALESCE(excluded.nome_comercial, companies.nome_comercial),
                        cnpj = COALESCE(excluded.cnpj, companies.cnpj),
                        setor_cvm = COALESCE(excluded.setor_cvm, companies.setor_cvm),
                        company_type = COALESCE(excluded.company_type, companies.company_type),
                        ticker_b3 = COALESCE(excluded.ticker_b3, companies.ticker_b3),
                        is_active = excluded.is_active,
                        updated_at = excluded.updated_at
                    """
                ),
                {
                    "cd_cvm": int(catalog_entry.cd_cvm),
                    "company_name": catalog_entry.company_name,
                    "nome_comercial": catalog_entry.nome_comercial,
                    "cnpj": catalog_entry.cnpj,
                    "setor_cvm": catalog_entry.setor_cvm,
                    "company_type": "comercial",
                    "ticker_b3": catalog_entry.ticker_b3,
                    "is_active": 1 if catalog_entry.is_active else 0,
                    "updated_at": now_iso,
                },
            )
        return True

    @functools.lru_cache(maxsize=10)
    def list_companies(
        self,
        *,
        search: str = "",
        sector_slug: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> CompanyDirectoryPage:
        resolved_sector_name = self._resolve_sector_slug(sector_slug)
        if sector_slug and resolved_sector_name is None:
            return self._empty_company_page(
                search=search,
                sector_slug=sector_slug,
                page=page,
                page_size=page_size,
            )

        rows_df, total_items = self.query_layer.get_companies_directory_page(
            search=search,
            sector_name=resolved_sector_name,
            page=page,
            page_size=page_size,
        )
        years_map = self.query_layer.get_company_years_map(rows_df["cd_cvm"].tolist()) if not rows_df.empty else {}
        if not rows_df.empty:
            rows_df = rows_df.copy()
            rows_df["anos_disponiveis"] = rows_df["cd_cvm"].map(lambda cd_cvm: years_map.get(int(cd_cvm), ()))

        total_pages = max(1, ((int(total_items) - 1) // int(page_size)) + 1) if total_items else 1
        pagination = CompanyDirectoryPagination(
            page=int(page),
            page_size=int(page_size),
            total_items=int(total_items),
            total_pages=int(total_pages),
            has_next=int(page) < int(total_pages),
            has_previous=int(page) > 1,
        )
        return CompanyDirectoryPage(
            items=tuple(self._build_company_results(rows_df)),
            pagination=pagination,
            applied_filters=CompanyDirectoryAppliedFilters(
                search=str(search or ""),
                sector=sector_slug,
            ),
        )

    def get_populares_companies(self) -> CompanyDirectoryPage:
        """Returns top-10 B3 companies by market cap in static rank order.

        The ranking is maintained in POPULARES_CVM_IDS. Companies missing from
        the local DB (e.g. during seeding) are silently omitted.
        """
        ids = list(POPULARES_CVM_IDS)
        rows_df = self.query_layer.get_companies_by_cvm_ids(ids)
        if not rows_df.empty:
            order_map = {cd: i for i, cd in enumerate(ids)}
            rows_df = rows_df.copy()
            rows_df["_order"] = rows_df["cd_cvm"].map(lambda x: order_map.get(int(x), 999))
            rows_df = rows_df.sort_values("_order").drop(columns=["_order"]).reset_index(drop=True)
            years_map = self.query_layer.get_company_years_map(rows_df["cd_cvm"].tolist())
            rows_df["anos_disponiveis"] = rows_df["cd_cvm"].map(lambda cd: years_map.get(int(cd), ()))
        n = len(rows_df)
        return CompanyDirectoryPage(
            items=tuple(self._build_company_results(rows_df)),
            pagination=CompanyDirectoryPagination(
                page=1, page_size=n, total_items=n,
                total_pages=1, has_next=False, has_previous=False,
            ),
            applied_filters=CompanyDirectoryAppliedFilters(search="", sector=None),
        )

    def get_em_destaque_companies(self, limit: int = 10) -> CompanyDirectoryPage:
        """Returns companies most visited globally, ordered by view_count DESC.

        Falls back gracefully to coverage_rank ordering when the company_views
        table is empty (e.g. immediately after deployment).
        """
        rows_df = self.query_layer.get_top_viewed_companies(limit=limit)
        if not rows_df.empty:
            rows_df = rows_df.copy()
            years_map = self.query_layer.get_company_years_map(rows_df["cd_cvm"].tolist())
            rows_df["anos_disponiveis"] = rows_df["cd_cvm"].map(lambda cd: years_map.get(int(cd), ()))
        n = len(rows_df)
        return CompanyDirectoryPage(
            items=tuple(self._build_company_results(rows_df)),
            pagination=CompanyDirectoryPagination(
                page=1, page_size=n, total_items=n,
                total_pages=1, has_next=False, has_previous=False,
            ),
            applied_filters=CompanyDirectoryAppliedFilters(search="", sector=None),
        )

    def record_company_view(self, cd_cvm: int) -> None:
        """Increments the global view counter for a company.

        Uses an upsert so the call is idempotent and safe under concurrent
        writes. Silently ignores unknown cd_cvm values (FK constraint skips
        the insert rather than raising).
        """
        now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    text("""
                        INSERT INTO company_views (cd_cvm, view_count, last_viewed_at)
                        VALUES (:cd, 1, :now)
                        ON CONFLICT(cd_cvm) DO UPDATE SET
                            view_count     = company_views.view_count + 1,
                            last_viewed_at = :now
                    """),
                    {"cd": int(cd_cvm), "now": now_iso},
                )
        except Exception:
            # Analytics must never break the API — log and continue
            import logging
            logging.getLogger(__name__).warning(
                "record_company_view failed for cd_cvm=%s", cd_cvm, exc_info=True
            )

    def get_company_filters(self) -> CompanyFiltersDTO:
        df = self.query_layer.get_available_company_sectors()
        sectors = tuple(
            CompanySectorFilterOption(
                sector_name=str(row["sector_name"]),
                sector_slug=sector_slugify(row["sector_name"]),
                company_count=int(row["company_count"] or 0),
            )
            for _, row in df.iterrows()
        )
        return CompanyFiltersDTO(sectors=sectors)

    @functools.lru_cache(maxsize=128)
    def suggest_companies(
        self,
        q: str,
        limit: int,
        *,
        ready_only: bool = False,
    ) -> tuple[CompanySuggestionDTO, ...]:
        df = self.query_layer.get_company_suggestions(
            q=q,
            limit=limit,
            ready_only=ready_only,
        )
        local_items = tuple(
            CompanySuggestionDTO(
                cd_cvm=int(row["cd_cvm"]),
                company_name=str(row["company_name"]),
                ticker_b3=str(row["ticker_b3"]) if row["ticker_b3"] else None,
                sector_slug=sector_slugify(str(row["sector_name"])),
            )
            for _, row in df.iterrows()
        )
        if ready_only or not str(q or "").strip() or len(local_items) >= int(limit):
            return local_items[: int(limit)]

        seen_codes = {item.cd_cvm for item in local_items}
        try:
            catalog_items = self.company_catalog.search_companies(
                q=q,
                limit=max(0, int(limit) - len(local_items)),
                exclude_codes=seen_codes,
            )
        except CompanyCatalogUnavailableError:
            return local_items[: int(limit)]

        fallback_items = tuple(
            CompanySuggestionDTO(
                cd_cvm=int(entry.cd_cvm),
                company_name=entry.company_name,
                ticker_b3=entry.ticker_b3,
                sector_slug=sector_slugify(
                    canonical_sector_name(None, entry.setor_cvm)
                ),
            )
            for entry in catalog_items
        )
        return (local_items + fallback_items)[: int(limit)]

    def resolve_sector_slug(self, sector_slug: str | None) -> str | None:
        return self._resolve_sector_slug(sector_slug)

    def list_sectors(self) -> SectorDirectoryDTO:
        sectors_df = self.query_layer.get_available_company_sectors()
        sector_years = self.query_layer.get_sector_years_map()
        metric_rows = self.query_layer.get_sector_metric_rows()
        yearly = self._aggregate_sector_yearly_metrics(metric_rows)

        items: list[SectorDirectoryItemDTO] = []
        for _, row in sectors_df.iterrows():
            sector_name = str(row["sector_name"])
            available_years = sector_years.get(sector_name, [])
            latest_year = max(available_years) if available_years else None
            snapshot_row = None
            if latest_year is not None and not yearly.empty:
                filtered = yearly[
                    (yearly["sector_name"] == sector_name)
                    & (yearly["year"] == latest_year)
                ]
                snapshot_row = filtered.iloc[0] if not filtered.empty else None

            if latest_year is None:
                continue

            items.append(
                SectorDirectoryItemDTO(
                    sector_name=sector_name,
                    sector_slug=sector_slugify(sector_name),
                    company_count=int(row["company_count"] or 0),
                    latest_year=latest_year,
                    snapshot=SectorSnapshotDTO(
                        roe=self._coerce_optional_float(snapshot_row["roe"]) if snapshot_row is not None else None,
                        mg_ebit=self._coerce_optional_float(snapshot_row["mg_ebit"]) if snapshot_row is not None else None,
                        mg_liq=self._coerce_optional_float(snapshot_row["mg_liq"]) if snapshot_row is not None else None,
                    ),
                )
            )

        items.sort(key=lambda item: (-item.company_count, item.sector_name))
        return SectorDirectoryDTO(items=tuple(items))

    def get_sector_detail(self, sector_slug: str, year: int | None = None) -> SectorDetailDTO | None:
        resolved_sector_name = self._resolve_sector_slug(sector_slug)
        if resolved_sector_name is None:
            return None

        company_rows, total_items = self.query_layer.get_sector_companies(resolved_sector_name)
        if company_rows.empty:
            return None

        years_map = self.query_layer.get_company_years_map(company_rows["cd_cvm"].tolist())
        company_rows = company_rows.copy()
        company_rows["anos_disponiveis"] = company_rows["cd_cvm"].map(
            lambda cd_cvm: years_map.get(int(cd_cvm), ())
        )
        available_years = self._extract_years_from_company_rows(company_rows)
        if not available_years:
            return None

        if year is None:
            selected_year = max(available_years)
        else:
            selected_year = int(year)
            if selected_year not in available_years:
                raise ValueError(
                    f"O parametro 'year' precisa ser um dos anos disponiveis do setor: {', '.join(str(value) for value in available_years)}."
                )

        metric_rows = self.query_layer.get_sector_metric_rows(sector_name=resolved_sector_name)
        yearly = self._aggregate_sector_yearly_metrics(metric_rows)
        yearly_overview = tuple(
            SectorYearOverviewDTO(
                year=int(row["year"]),
                roe=self._coerce_optional_float(row["roe"]),
                mg_ebit=self._coerce_optional_float(row["mg_ebit"]),
                mg_liq=self._coerce_optional_float(row["mg_liq"]),
            )
            for _, row in yearly[yearly["sector_name"] == resolved_sector_name]
            .sort_values("year")
            .iterrows()
        )

        company_metrics = metric_rows[metric_rows["report_year"] == selected_year].copy()
        selected_companies = company_rows[
            company_rows["anos_disponiveis"].map(lambda years: selected_year in years)
        ][["cd_cvm", "company_name", "ticker_b3"]].drop_duplicates()
        selected_companies = selected_companies.merge(
            company_metrics[
                ["cd_cvm", "roe", "mg_ebit", "mg_liq"]
            ],
            on="cd_cvm",
            how="left",
        )
        selected_companies["ticker_b3"] = selected_companies["ticker_b3"].replace("", None)
        selected_companies["sort_roe"] = pd.to_numeric(selected_companies["roe"], errors="coerce")
        selected_companies = selected_companies.sort_values(
            by=["sort_roe", "company_name"],
            ascending=[False, True],
            na_position="last",
        )

        companies = tuple(
            SectorCompanyMetricDTO(
                cd_cvm=int(row["cd_cvm"]),
                company_name=str(row["company_name"]),
                ticker_b3=self._clean_optional_text(row.get("ticker_b3")),
                roe=self._coerce_optional_float(row.get("roe")),
                mg_ebit=self._coerce_optional_float(row.get("mg_ebit")),
                mg_liq=self._coerce_optional_float(row.get("mg_liq")),
            )
            for _, row in selected_companies.iterrows()
        )

        return SectorDetailDTO(
            sector_name=resolved_sector_name,
            sector_slug=sector_slugify(resolved_sector_name),
            company_count=int(total_items),
            available_years=tuple(available_years),
            selected_year=int(selected_year),
            yearly_overview=yearly_overview,
            companies=companies,
        )

    def get_statement_matrix(
        self,
        cd_cvm: int,
        years: list[int],
        stmt_type: str,
        *,
        exclude_conflicts: bool = True,
    ) -> StatementMatrix:
        df = self.query_layer.get_statement(
            cd_cvm=cd_cvm,
            years=years,
            stmt_type=stmt_type,
            exclude_conflicts=exclude_conflicts,
        )
        return StatementMatrix(
            cd_cvm=int(cd_cvm),
            statement_type=str(stmt_type),
            years=tuple(int(year) for year in years),
            table=TabularData.from_dataframe(df),
            exclude_conflicts=bool(exclude_conflicts),
        )

    def get_statement_dataframe(
        self,
        cd_cvm: int,
        years: list[int],
        stmt_type: str,
        *,
        exclude_conflicts: bool = True,
    ) -> pd.DataFrame:
        return self.get_statement_matrix(
            cd_cvm,
            years,
            stmt_type,
            exclude_conflicts=exclude_conflicts,
        ).to_dataframe()

    def get_kpi_bundle(self, cd_cvm: int, years: list[int]) -> KPIBundle:
        accounts = self.query_layer.get_kpi_accounts(cd_cvm, years)
        da_series = self.query_layer.get_da_from_dfc(cd_cvm, years)
        annual = compute_all_kpis(accounts, da_series)

        quarterly_accounts = self.query_layer.get_kpi_accounts_all_periods(cd_cvm, years)
        quarterly_da = self.query_layer.get_da_all_periods(cd_cvm, years)
        quarterly = compute_quarterly_kpis(quarterly_accounts, quarterly_da)

        return KPIBundle(
            cd_cvm=int(cd_cvm),
            years=tuple(int(year) for year in years),
            annual=TabularData.from_dataframe(annual),
            quarterly=TabularData.from_dataframe(quarterly),
        )

    def get_statement_summary(self, cd_cvm: int, years: list[int]) -> StatementSummaryDTO:
        stmt_types = ["DRE", "BPA", "BPP", "DFC"]
        statements = {
            s: self.query_layer.get_statement(
                cd_cvm=cd_cvm,
                years=years,
                stmt_type=s,
                exclude_conflicts=True,
            )
            for s in stmt_types
        }
        raw_blocks = build_general_summary_blocks(statements)
        blocks = tuple(
            SummaryBlockDTO(
                stmt_type=b.stmt_type,
                title=b.title,
                table=TabularData.from_dataframe(b.rows),
            )
            for b in raw_blocks
        )
        return StatementSummaryDTO(
            cd_cvm=int(cd_cvm),
            years=tuple(sorted(int(y) for y in years)),
            blocks=blocks,
        )

    def build_company_excel_export(self, cd_cvm: int) -> tuple[str, bytes]:
        company_info = self.get_company_info_dict(cd_cvm)
        if not company_info:
            raise ValueError(f"Empresa {cd_cvm} nao encontrada.")

        years = self.get_available_years(cd_cvm)
        if not years:
            raise ValueError(f"Empresa {cd_cvm} nao possui anos disponiveis para exportacao.")

        statements = {
            stmt_type: self.get_statement_dataframe(cd_cvm, years, stmt_type)
            for stmt_type in EXPORT_STATEMENT_TYPES
        }
        exportable_statements = {
            stmt_type: df
            for stmt_type, df in statements.items()
            if df is not None and not df.empty
        }
        extra_sheets = [
            stmt_type
            for stmt_type in ("DVA", "DMPL")
            if stmt_type in exportable_statements
        ]
        kpis_df = self.get_kpi_bundle(cd_cvm, years).quarterly_dataframe()

        exporter = ExcelExporter(
            company_info=company_info,
            statements=exportable_statements,
            kpis_df=kpis_df,
            extra_sheets=extra_sheets,
        )
        return build_excel_filename(company_info), exporter.export()

    def build_companies_excel_batch_export(self, cd_cvms: list[int]) -> tuple[str, bytes]:
        if len(cd_cvms) < 2:
            raise ValueError("O lote de exportacao exige ao menos 2 empresas.")

        seen: set[int] = set()
        unique_ids: list[int] = []
        for cd_cvm in cd_cvms:
            normalized = int(cd_cvm)
            if normalized in seen:
                raise ValueError("O lote de exportacao nao aceita empresas duplicadas.")
            seen.add(normalized)
            unique_ids.append(normalized)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for cd_cvm in unique_ids:
                filename, payload = self.build_company_excel_export(cd_cvm)
                archive.writestr(filename, payload)

        buffer.seek(0)
        return "comparar_excel_lote.zip", buffer.read()

    def get_health_snapshot(
        self,
        start_year: int,
        end_year: int,
        *,
        force_refresh: bool = False,
    ) -> HealthSnapshot:
        del force_refresh
        resolved_start_year, resolved_end_year = self._resolve_refresh_range(
            start_year=start_year,
            end_year=end_year,
        )
        payload = self._build_db_health_snapshot(
            start_year=resolved_start_year,
            end_year=resolved_end_year,
        )
        return HealthSnapshot.from_payload(payload)

    def list_refresh_status(self, cd_cvm: int | None = None) -> list[RefreshStatusDTO]:
        self.refresh_job_repository.ensure_schema()

        query = text(
            """
            SELECT
                cd_cvm,
                company_name,
                source_scope,
                job_id,
                stage,
                queue_position,
                last_attempt_at,
                last_success_at,
                last_status,
                last_error,
                last_start_year,
                last_end_year,
                last_rows_inserted,
                progress_current,
                progress_total,
                progress_message,
                started_at,
                heartbeat_at,
                finished_at,
                read_model_updated_at,
                updated_at
            FROM company_refresh_status
            WHERE (:cd_cvm IS NULL OR cd_cvm = :cd_cvm)
            ORDER BY company_name
            """
        )
        with self.engine.connect() as conn:
            rows = conn.execute(query, {"cd_cvm": int(cd_cvm) if cd_cvm is not None else None}).mappings().all()
        cd_cvms = [int(row["cd_cvm"]) for row in rows]
        active_jobs = self._load_active_refresh_jobs_map(cd_cvms)
        readable_years_map = (
            self.query_layer.get_company_years_map(cd_cvms)
            if cd_cvms
            else {}
        )
        read_model_state_map = self._load_company_read_model_state_map(
            cd_cvms,
            precomputed_years_map=readable_years_map,
        )
        duration_profile = (
            self._estimate_refresh_duration_profile()
            if any(
                str(row.get("last_status") or "").strip().lower()
                in self.ACTIVE_REFRESH_STATUSES
                for row in rows
            ) or active_jobs
            else None
        )
        return [
            self._build_refresh_status_dto(
                row,
                duration_profile=duration_profile,
                active_job=active_jobs.get(int(row["cd_cvm"])),
                read_model_state=read_model_state_map.get(
                    int(row["cd_cvm"]),
                    {},
                ),
            )
            for row in rows
        ]

    def _load_company_read_model_state_map(
        self,
        cd_cvms: list[int] | tuple[int, ...],
        *,
        precomputed_years_map: dict[int, Any] | None = None,
    ) -> dict[int, dict[str, Any]]:
        unique_ids = sorted({int(cd_cvm) for cd_cvm in cd_cvms})
        if not unique_ids:
            return {}

        years_map = (
            precomputed_years_map
            if precomputed_years_map is not None
            else self.query_layer.get_company_years_map(unique_ids)
        )
        projection_updated_at: dict[int, str] = {}
        company_updated_at: dict[int, str] = {}

        with self.engine.connect() as conn:
            if inspect(conn).has_table("company_refresh_status"):
                status_columns = {
                    str(column.get("name") or "").lower()
                    for column in inspect(conn).get_columns("company_refresh_status")
                }
                if "read_model_updated_at" in status_columns:
                    rows = conn.execute(
                        text(
                            """
                            SELECT cd_cvm, read_model_updated_at
                            FROM company_refresh_status
                            WHERE cd_cvm IN :cd_cvms
                            """
                        ).bindparams(bindparam("cd_cvms", expanding=True)),
                        {"cd_cvms": unique_ids},
                    ).mappings().all()
                    projection_updated_at = {
                        int(row["cd_cvm"]): str(row["read_model_updated_at"])
                        for row in rows
                        if row.get("read_model_updated_at") is not None
                    }
            if inspect(conn).has_table("companies"):
                company_rows = conn.execute(
                    text(
                        """
                        SELECT cd_cvm, updated_at
                        FROM companies
                        WHERE cd_cvm IN :cd_cvms
                        """
                    ).bindparams(bindparam("cd_cvms", expanding=True)),
                    {"cd_cvms": unique_ids},
                ).mappings().all()
                company_updated_at = {
                    int(row["cd_cvm"]): str(row["updated_at"])
                    for row in company_rows
                    if row.get("updated_at") is not None
                }

        state_map: dict[int, dict[str, Any]] = {}
        for cd_cvm in unique_ids:
            readable_years = tuple(
                sorted(int(year) for year in years_map.get(int(cd_cvm), ()))
            )
            has_readable_data = bool(readable_years)
            state_map[int(cd_cvm)] = {
                "has_readable_current_data": has_readable_data,
                "readable_years_count": len(readable_years),
                "latest_readable_year": (
                    int(readable_years[-1]) if readable_years else None
                ),
                "read_model_updated_at": (
                    projection_updated_at.get(int(cd_cvm))
                    or (
                        company_updated_at.get(int(cd_cvm))
                        if has_readable_data
                        else None
                    )
                ),
            }
        return state_map

    def _build_refresh_status_dto(
        self,
        row: dict[str, Any],
        *,
        duration_profile: dict[str, Any] | None,
        active_job: dict[str, Any] | None,
        read_model_state: dict[str, Any],
    ) -> RefreshStatusDTO:
        readable_years_count = int(
            read_model_state.get("readable_years_count") or 0
        )
        has_readable_current_data = bool(
            read_model_state.get("has_readable_current_data")
        )
        latest_readable_year = read_model_state.get("latest_readable_year")
        latest_attempt_outcome = self._normalize_refresh_status(row.get("last_status")) or None
        tracking_state = self._resolve_refresh_tracking_state(
            row,
            active_job=active_job,
            duration_profile=duration_profile,
            has_readable_current_data=has_readable_current_data,
        )
        estimate = self._estimate_refresh_runtime(
            row,
            duration_profile=duration_profile,
            active_job=active_job,
            tracking_state=tracking_state,
        )
        status_reason_code, status_reason_message = self._build_refresh_status_reason(
            row,
            tracking_state=tracking_state,
            active_job=active_job,
            has_readable_current_data=has_readable_current_data,
        )
        read_availability = self._build_read_availability_summary(
            has_readable_current_data=has_readable_current_data,
            readable_years_count=readable_years_count,
            latest_readable_year=(
                int(latest_readable_year)
                if latest_readable_year is not None
                else None
            ),
        )
        latest_attempt_reason = self._build_latest_attempt_reason(
            row,
            tracking_state=tracking_state,
            active_job=active_job,
            has_readable_current_data=has_readable_current_data,
        )
        freshness_summary = self._build_freshness_summary(
            row,
            tracking_state=tracking_state,
            has_readable_current_data=has_readable_current_data,
            status_reason_code=status_reason_code,
            status_reason_message=status_reason_message,
            latest_attempt_reason=latest_attempt_reason,
        )
        return RefreshStatusDTO(
            cd_cvm=int(row["cd_cvm"]),
            company_name=str(row["company_name"] or ""),
            source_scope=row.get("source_scope"),
            job_id=row.get("job_id"),
            stage=row.get("stage"),
            queue_position=(
                int(row["queue_position"])
                if row.get("queue_position") is not None
                else None
            ),
            last_attempt_at=row.get("last_attempt_at"),
            last_success_at=row.get("last_success_at"),
            last_status=row.get("last_status"),
            last_error=row.get("last_error"),
            last_start_year=(
                int(row["last_start_year"])
                if row.get("last_start_year") is not None
                else None
            ),
            last_end_year=(
                int(row["last_end_year"])
                if row.get("last_end_year") is not None
                else None
            ),
            last_rows_inserted=(
                int(row["last_rows_inserted"])
                if row.get("last_rows_inserted") is not None
                else None
            ),
            progress_current=(
                int(row["progress_current"])
                if row.get("progress_current") is not None
                else None
            ),
            progress_total=(
                int(row["progress_total"])
                if row.get("progress_total") is not None
                else None
            ),
            progress_message=row.get("progress_message"),
            started_at=row.get("started_at"),
            heartbeat_at=row.get("heartbeat_at"),
            finished_at=row.get("finished_at"),
            updated_at=row.get("updated_at"),
            read_model_updated_at=(
                str(read_model_state["read_model_updated_at"])
                if read_model_state.get("read_model_updated_at") is not None
                else row.get("read_model_updated_at")
            ),
            estimated_progress_pct=estimate["estimated_progress_pct"],
            estimated_eta_seconds=estimate["estimated_eta_seconds"],
            estimated_total_seconds=estimate["estimated_total_seconds"],
            elapsed_seconds=estimate["elapsed_seconds"],
            estimated_completion_at=estimate["estimated_completion_at"],
            estimate_confidence=estimate["estimate_confidence"],
            tracking_state=tracking_state,
            progress_mode=estimate["progress_mode"],
            is_retry_allowed=self._is_refresh_retry_allowed(
                tracking_state=tracking_state,
                active_job=active_job,
            ),
            status_reason_code=status_reason_code,
            status_reason_message=status_reason_message,
            has_readable_current_data=has_readable_current_data,
            readable_years_count=int(readable_years_count or 0),
            latest_readable_year=(
                int(latest_readable_year)
                if latest_readable_year is not None
                else None
            ),
            latest_attempt_outcome=latest_attempt_outcome,
            latest_attempt_reason_code=latest_attempt_reason["code"],
            latest_attempt_reason_message=latest_attempt_reason["message"],
            latest_attempt_retryable=bool(latest_attempt_reason["retryable"]),
            read_availability_code=read_availability["code"],
            read_availability_message=read_availability["message"],
            freshness_summary_code=freshness_summary["code"],
            freshness_summary_message=freshness_summary["message"],
            freshness_summary_severity=freshness_summary["severity"],
            source_label=self._build_refresh_source_label(
                row.get("source_scope"),
                has_readable_current_data=has_readable_current_data,
            ),
        )

    def request_company_refresh(self, cd_cvm: int) -> RefreshDispatchDTO:
        """Enqueue internal on-demand ingest for one company."""
        from apps.api.app.dependencies import NotFoundError

        bootstrapped = self._ensure_company_catalog_metadata(cd_cvm)
        start_year, end_year = self._resolve_refresh_range(start_year=2010, end_year=None)
        company_info = self.get_company_info(cd_cvm)
        if company_info is None:
            raise NotFoundError(f"Company cd_cvm={cd_cvm} not found")

        source_scope = "on_demand_bootstrap" if bootstrapped else "on_demand"
        request = RefreshRequest(
            companies=(str(cd_cvm),),
            start_year=start_year,
            end_year=end_year,
            policy=RefreshPolicy(
                skip_complete_company_years=True,
                enable_fast_lane=False,
                force_refresh=False,
            ),
        )
        planned_companies, _, _ = self.refresh_service.build_company_year_plan(request)

        active_job = self.refresh_job_repository.get_active_job_for_company(cd_cvm)
        if active_job is not None:
            raise RefreshAlreadyActiveError(
                f"Refresh already active for cd_cvm={cd_cvm}"
            )

        if not planned_companies:
            projection = self.refresh_job_repository.mark_already_current(
                cd_cvm=cd_cvm,
                company_name=company_info.company_name,
                source_scope=source_scope,
                start_year=start_year,
                end_year=end_year,
                message=(
                    "Empresa ja atualizada para "
                    f"{start_year}-{end_year}."
                ),
            )
            return RefreshDispatchDTO(
                status="already_current",
                cd_cvm=int(cd_cvm),
                job_id=None,
                accepted_at=str(projection["accepted_at"]),
                message=str(projection["message"]),
                status_reason_code="already_current",
                status_reason_message=(
                    "Esta empresa ja estava atualizada para a janela padrao."
                ),
                is_retry_allowed=False,
            )

        job = self.refresh_job_repository.enqueue_job(
            cd_cvm=cd_cvm,
            company_name=company_info.company_name,
            source_scope=source_scope,
            start_year=start_year,
            end_year=end_year,
        )
        if job is None:
            raise RefreshAlreadyActiveError(
                f"Refresh already active for cd_cvm={cd_cvm}"
            )

        return RefreshDispatchDTO(
            status="queued",
            cd_cvm=int(cd_cvm),
            job_id=str(job.id),
            accepted_at=str(job.requested_at),
            message=str(
                job.progress_message
                or "Solicitacao enfileirada para processamento interno."
            ),
            status_reason_code="refresh_queued",
            status_reason_message=(
                "Solicitacao aceita e aguardando processamento interno."
            ),
            is_retry_allowed=False,
        )

    def request_top_ranked_historical_refresh(
        self,
        *,
        limit: int = 80,
        start_year: int = 2010,
        end_year: int | None = None,
    ) -> RankedRefreshQueueResult:
        resolved_start_year, resolved_end_year = self._resolve_refresh_range(
            start_year=start_year,
            end_year=end_year,
        )
        backlog = self._build_ranked_backlog(
            limit=int(limit),
            start_year=resolved_start_year,
            end_year=resolved_end_year,
        )

        queue_window = timedelta(hours=self.PRIORITIZED_BACKLOG_STALE_HOURS)
        items: list[RankedRefreshQueueItem] = []
        counters = {
            "queued_count": 0,
            "already_queued_count": 0,
            "no_data_excluded_count": 0,
            "already_complete_count": 0,
            "dispatch_failed_count": 0,
        }

        for row in backlog["items"]:
            status = str(row["recommended_action"])
            note = str(row["reason"])

            if status == "queue_historical_backfill":
                dispatch_result = self._dispatch_refresh_request(
                    cd_cvm=int(row["cd_cvm"]),
                    start_year=resolved_start_year,
                    end_year=resolved_end_year,
                    source_scope="ranked_backfill",
                    already_queued_window=queue_window,
                )
                if dispatch_result == "dispatched":
                    status = "queued"
                    note = (
                        f"Workflow enfileirado para backfill anual entre "
                        f"{resolved_start_year} e {resolved_end_year}."
                    )
                    counters["queued_count"] += 1
                elif dispatch_result == "already_queued":
                    status = "already_queued"
                    note = "Ja existe uma execucao recente em fila para esta empresa."
                    counters["already_queued_count"] += 1
                else:
                    status = "dispatch_failed"
                    note = "Falha ao disparar o workflow de backfill historico."
                    counters["dispatch_failed_count"] += 1
            elif status == "await_existing_queue":
                status = "already_queued"
                counters["already_queued_count"] += 1
            elif status == "skip_no_data":
                status = "no_data_excluded"
                counters["no_data_excluded_count"] += 1
            else:
                status = "already_complete"
                counters["already_complete_count"] += 1

            items.append(
                RankedRefreshQueueItem(
                    cd_cvm=int(row["cd_cvm"]),
                    company_name=str(row["company_name"]),
                    coverage_rank=(
                        int(row["coverage_rank"])
                        if row.get("coverage_rank") is not None
                        else None
                    ),
                    status=status,
                    last_status=(
                        str(row["last_status"])
                        if row.get("last_status") is not None
                        else None
                    ),
                    missing_years_count=int(row["missing_years_count"]),
                    years_missing=tuple(int(year) for year in row["years_missing"]),
                    note=note,
                )
            )

        return RankedRefreshQueueResult(
            start_year=resolved_start_year,
            end_year=resolved_end_year,
            requested_limit=int(limit),
            total_ranked=int(backlog["summary"]["total_ranked"]),
            queued_count=int(counters["queued_count"]),
            already_queued_count=int(counters["already_queued_count"]),
            no_data_excluded_count=int(counters["no_data_excluded_count"]),
            already_complete_count=int(counters["already_complete_count"]),
            dispatch_failed_count=int(counters["dispatch_failed_count"]),
            items=tuple(items),
        )

    def _build_db_health_snapshot(self, *, start_year: int, end_year: int) -> dict[str, Any]:
        active_rows = self._load_active_company_rows()
        years_scope = list(range(int(start_year), int(end_year) + 1))
        company_codes = [int(row["cd_cvm"]) for row in active_rows]
        complete_years_map = self._load_complete_annual_years_map(
            company_codes,
            start_year=start_year,
            end_year=end_year,
        )
        status_map = self._load_refresh_status_map(company_codes)

        per_year_buckets = {
            int(year): {
                "year": int(year),
                "total_companies": int(len(active_rows)),
                "completed": 0,
            }
            for year in years_scope
        }
        company_rows: list[dict[str, Any]] = []
        leader_completed = 0

        for row in active_rows:
            cd_cvm = int(row["cd_cvm"])
            completed_years = set(complete_years_map.get(cd_cvm, ()))
            years_completed = [year for year in years_scope if year in completed_years]
            years_missing = [year for year in years_scope if year not in completed_years]
            leader_completed = max(leader_completed, len(years_completed))
            for year in years_completed:
                per_year_buckets[int(year)]["completed"] += 1
            company_rows.append(
                {
                    "cd_cvm": cd_cvm,
                    "company_name": str(row["company_name"]),
                    "coverage_rank": (
                        int(row["coverage_rank"])
                        if row.get("coverage_rank") is not None
                        else None
                    ),
                    "years_completed": years_completed,
                    "years_missing": years_missing,
                    "completed_years_count": len(years_completed),
                    "missing_years_count": len(years_missing),
                    "last_status": status_map.get(cd_cvm, {}).get("last_status"),
                }
            )

        total_cells = int(len(active_rows) * len(years_scope))
        completed_cells = int(sum(bucket["completed"] for bucket in per_year_buckets.values()))
        missing_cells = max(0, total_cells - completed_cells)
        pct = (100.0 * completed_cells / total_cells) if total_cells else 0.0

        throughput = self._estimate_refresh_throughput()
        throughput_per_hour = throughput.get("per_hour")
        remaining_companies = sum(
            1 for row in company_rows if int(row["missing_years_count"]) > 0
        )
        eta_hours = (
            float(remaining_companies) / float(throughput_per_hour)
            if throughput_per_hour
            else None
        )

        per_year = []
        for year in years_scope:
            completed = int(per_year_buckets[int(year)]["completed"])
            total_companies = int(per_year_buckets[int(year)]["total_companies"])
            missing = max(0, total_companies - completed)
            per_year.append(
                {
                    "year": int(year),
                    "total_companies": total_companies,
                    "completed": completed,
                    "missing": missing,
                    "pct": (100.0 * completed / total_companies) if total_companies else 0.0,
                    "eta_hours": (
                        float(missing) / float(throughput_per_hour)
                        if throughput_per_hour
                        else None
                    ),
                }
            )

        ranked_backlog = self._build_ranked_backlog(
            limit=80,
            start_year=start_year,
            end_year=end_year,
            complete_years_map=complete_years_map,
            refresh_status_map=status_map,
        )

        prioritized_companies: list[dict[str, Any]] = []
        for row in ranked_backlog["items"]:
            gap_to_leader = max(
                0,
                int(leader_completed) - int(row["completed_years_count"]),
            )
            prioritized_companies.append(
                {
                    "cd_cvm": int(row["cd_cvm"]),
                    "company_name": str(row["company_name"]),
                    "coverage_rank": (
                        int(row["coverage_rank"])
                        if row.get("coverage_rank") is not None
                        else None
                    ),
                    "last_status": (
                        str(row["last_status"])
                        if row.get("last_status") is not None
                        else None
                    ),
                    "excluded_from_queue": bool(row["excluded_from_queue"]),
                    "risk_level": str(row["risk_level"]),
                    "priority_score": int(row["priority_score"]),
                    "missing_years_count": int(row["missing_years_count"]),
                    "gap_to_leader_years": int(gap_to_leader),
                    "years_missing": list(int(year) for year in row["years_missing"]),
                    "recommended_action": str(row["recommended_action"]),
                    "reason": str(row["reason"]),
                }
            )

        throughput_confidence = str(throughput.get("confidence") or "low")
        if throughput_per_hour:
            throughput_score = {
                "high": 100.0,
                "medium": 75.0,
                "low": 55.0,
            }.get(throughput_confidence, 55.0)
        else:
            throughput_score = {
                "high": 70.0,
                "medium": 50.0,
                "low": 30.0,
            }.get(throughput_confidence, 30.0)

        latest_year_pct = float(per_year[-1]["pct"]) if per_year else pct
        health_score = max(
            0.0,
            min(
                100.0,
                (0.6 * float(pct))
                + (0.2 * float(latest_year_pct))
                + (0.2 * float(throughput_score)),
            ),
        )

        return {
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "start_year": int(start_year),
            "end_year": int(end_year),
            "scope": "database_backed",
            "required_package": list(self.REQUIRED_PACKAGE_STATEMENTS),
            "ranked_backlog": dict(ranked_backlog["summary"]),
            "active_companies": int(len(active_rows)),
            "global": {
                "total_cells": int(total_cells),
                "completed_cells": int(completed_cells),
                "missing_cells": int(missing_cells),
                "pct": float(pct),
                "active_universe": int(len(active_rows)),
                "remaining_companies": int(remaining_companies),
                "eta_hours": eta_hours,
            },
            "throughput": throughput,
            "per_year": per_year,
            "health_score": round(float(health_score), 2),
            "health_status": self._health_status_from_score(health_score),
            "prioritized_companies": prioritized_companies,
        }

    def _build_ranked_backlog(
        self,
        *,
        limit: int,
        start_year: int,
        end_year: int,
        complete_years_map: dict[int, tuple[int, ...]] | None = None,
        refresh_status_map: dict[int, dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        ranked_rows = self._load_ranked_company_rows(limit)
        company_codes = [int(row["cd_cvm"]) for row in ranked_rows]
        years_scope = list(range(int(start_year), int(end_year) + 1))
        complete_map = complete_years_map or self._load_complete_annual_years_map(
            company_codes,
            start_year=start_year,
            end_year=end_year,
        )
        status_map = refresh_status_map or self._load_refresh_status_map(company_codes)
        leader_completed = max(
            (len(complete_map.get(code, ())) for code in company_codes),
            default=0,
        )

        items: list[dict[str, Any]] = []
        companies_with_some_data = 0
        fully_covered_companies = 0
        queue_eligible_companies = 0
        queued_companies = 0
        no_data_excluded_companies = 0

        for row in ranked_rows:
            cd_cvm = int(row["cd_cvm"])
            coverage_rank = (
                int(row["coverage_rank"])
                if row.get("coverage_rank") is not None
                else None
            )
            completed_years = set(int(year) for year in complete_map.get(cd_cvm, ()))
            years_completed = [year for year in years_scope if year in completed_years]
            years_missing = [year for year in years_scope if year not in completed_years]
            status_row = status_map.get(cd_cvm, {})
            last_status = (
                str(status_row.get("last_status")).strip().lower()
                if status_row.get("last_status") is not None
                else None
            )
            excluded_from_queue = last_status == "no_data"
            already_queued = self._is_recently_queued(
                status_row,
                window=timedelta(hours=self.PRIORITIZED_BACKLOG_STALE_HOURS),
            )

            if years_completed:
                companies_with_some_data += 1
            if not years_missing:
                fully_covered_companies += 1
            elif excluded_from_queue:
                no_data_excluded_companies += 1
            elif already_queued:
                queued_companies += 1
            else:
                queue_eligible_companies += 1

            if not years_missing:
                recommended_action = "already_complete"
                reason = "Cobertura anual completa na janela solicitada."
            elif excluded_from_queue:
                recommended_action = "skip_no_data"
                reason = "Empresa marcada como no_data; backlog automatico nao reenfileira."
            elif already_queued:
                recommended_action = "await_existing_queue"
                reason = "Ja existe refresh recente em fila para esta empresa."
            elif years_completed:
                recommended_action = "queue_historical_backfill"
                reason = "Empresa com dados parciais; falta backfill anual dos anos ausentes."
            else:
                recommended_action = "queue_historical_backfill"
                reason = "Empresa sem cobertura anual na janela; elegivel para ingestao historica."

            gap_to_leader = max(0, leader_completed - len(years_completed))
            items.append(
                {
                    "cd_cvm": cd_cvm,
                    "company_name": str(row["company_name"]),
                    "coverage_rank": coverage_rank,
                    "last_status": last_status,
                    "excluded_from_queue": excluded_from_queue,
                    "completed_years_count": len(years_completed),
                    "missing_years_count": len(years_missing),
                    "years_missing": years_missing,
                    "priority_score": self._priority_score(
                        coverage_rank=coverage_rank,
                        missing_years_count=len(years_missing),
                        gap_to_leader_years=gap_to_leader,
                    ),
                    "risk_level": self._risk_level(
                        coverage_rank=coverage_rank,
                        missing_years_count=len(years_missing),
                        excluded_from_queue=excluded_from_queue,
                    ),
                    "recommended_action": recommended_action,
                    "reason": reason,
                }
            )

        return {
            "summary": {
                "total_ranked": int(len(ranked_rows)),
                "companies_with_some_data": int(companies_with_some_data),
                "fully_covered_companies": int(fully_covered_companies),
                "queue_eligible_companies": int(queue_eligible_companies),
                "already_queued_companies": int(queued_companies),
                "no_data_excluded_companies": int(no_data_excluded_companies),
            },
            "items": items,
        }

    def _dispatch_refresh_request(
        self,
        *,
        cd_cvm: int,
        start_year: int,
        end_year: int,
        source_scope: str,
        already_queued_window: timedelta,
    ) -> str:
        from apps.api.app.dependencies import NotFoundError
        from src.github_dispatch import dispatch_on_demand_ingest

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        with self.engine.begin() as conn:
            self._ensure_refresh_status_table(conn)
            company_row = conn.execute(
                text(
                    """
                    SELECT c.company_name, crs.last_status, crs.last_attempt_at
                    FROM companies c
                    LEFT JOIN company_refresh_status crs ON crs.cd_cvm = c.cd_cvm
                    WHERE c.cd_cvm = :cd_cvm
                    """
                ),
                {"cd_cvm": int(cd_cvm)},
            ).mappings().fetchone()
            if company_row is None:
                raise NotFoundError(f"Company cd_cvm={cd_cvm} not found")
            if self._is_recently_queued(company_row, window=already_queued_window):
                return "already_queued"

            company_name = str(company_row.get("company_name") or cd_cvm)
            conn.execute(
                text(
                    """
                    INSERT INTO company_refresh_status (
                        cd_cvm,
                        company_name,
                        source_scope,
                        last_attempt_at,
                        last_status,
                        last_error,
                        last_start_year,
                        last_end_year,
                        updated_at
                    ) VALUES (
                        :cd_cvm,
                        :company_name,
                        :source_scope,
                        :now,
                        'queued',
                        NULL,
                        :start_year,
                        :end_year,
                        :now
                    )
                    ON CONFLICT (cd_cvm) DO UPDATE SET
                        company_name = excluded.company_name,
                        source_scope = excluded.source_scope,
                        last_attempt_at = excluded.last_attempt_at,
                        last_status = excluded.last_status,
                        last_error = excluded.last_error,
                        last_start_year = excluded.last_start_year,
                        last_end_year = excluded.last_end_year,
                        updated_at = excluded.updated_at
                    """
                ),
                {
                    "cd_cvm": int(cd_cvm),
                    "company_name": company_name,
                    "source_scope": str(source_scope),
                    "start_year": int(start_year),
                    "end_year": int(end_year),
                    "now": now_iso,
                },
            )

        ok, error_msg = dispatch_on_demand_ingest(
            int(cd_cvm),
            start_year=int(start_year),
            end_year=int(end_year),
        )
        if not ok:
            with self.engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        UPDATE company_refresh_status
                        SET last_status = 'dispatch_failed',
                            last_error = :error_msg,
                            last_start_year = :start_year,
                            last_end_year = :end_year,
                            updated_at = :now
                        WHERE cd_cvm = :cd_cvm
                        """
                    ),
                    {
                        "cd_cvm": int(cd_cvm),
                        "error_msg": error_msg,
                        "start_year": int(start_year),
                        "end_year": int(end_year),
                        "now": now_iso,
                    },
                )
            return "dispatch_failed"

        return "dispatched"

    def _resolve_refresh_range(
        self,
        *,
        start_year: int,
        end_year: int | None,
    ) -> tuple[int, int]:
        resolved_start_year = int(start_year)
        resolved_end_year = (
            int(end_year)
            if end_year is not None
            else max(2010, datetime.now(timezone.utc).year - 1)
        )
        if resolved_start_year > resolved_end_year:
            raise ValueError("start_year must be <= end_year")
        return resolved_start_year, resolved_end_year

    def _load_active_company_rows(self) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT cd_cvm, company_name, coverage_rank
            FROM companies
            WHERE COALESCE(is_active, 1) = 1
            ORDER BY
                CASE WHEN coverage_rank IS NULL THEN 1 ELSE 0 END,
                coverage_rank ASC,
                company_name ASC
            """
        )
        with self.engine.connect() as conn:
            return [dict(row) for row in conn.execute(query).mappings().all()]

    def _load_ranked_company_rows(self, limit: int) -> list[dict[str, Any]]:
        query = text(
            """
            SELECT cd_cvm, company_name, coverage_rank
            FROM companies
            WHERE COALESCE(is_active, 1) = 1
              AND coverage_rank IS NOT NULL
            ORDER BY coverage_rank ASC, company_name ASC
            LIMIT :limit
            """
        )
        with self.engine.connect() as conn:
            return [
                dict(row)
                for row in conn.execute(query, {"limit": int(limit)}).mappings().all()
            ]

    def _load_complete_annual_years_map(
        self,
        cd_cvms: list[int],
        *,
        start_year: int,
        end_year: int,
    ) -> dict[int, tuple[int, ...]]:
        if not cd_cvms or not inspect(self.engine).has_table("financial_reports"):
            return {}

        query = text(
            """
            SELECT "CD_CVM" AS cd_cvm, "REPORT_YEAR" AS report_year
            FROM financial_reports
            WHERE "CD_CVM" IN :cd_cvms
              AND "REPORT_YEAR" BETWEEN :start_year AND :end_year
              AND "STATEMENT_TYPE" IN :statement_types
              AND "PERIOD_LABEL" = CAST("REPORT_YEAR" AS TEXT)
            GROUP BY "CD_CVM", "REPORT_YEAR"
            HAVING COUNT(DISTINCT "STATEMENT_TYPE") >= :required_count
            ORDER BY "CD_CVM", "REPORT_YEAR"
            """
        ).bindparams(
            bindparam("cd_cvms", expanding=True),
            bindparam("statement_types", expanding=True),
        )

        params = {
            "cd_cvms": [int(cd_cvm) for cd_cvm in cd_cvms],
            "start_year": int(start_year),
            "end_year": int(end_year),
            "statement_types": list(self.REQUIRED_PACKAGE_STATEMENTS),
            "required_count": len(self.REQUIRED_PACKAGE_STATEMENTS),
        }
        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()

        years_map: dict[int, list[int]] = defaultdict(list)
        for row in rows:
            years_map[int(row["cd_cvm"])].append(int(row["report_year"]))
        return {
            int(cd_cvm): tuple(sorted(set(years)))
            for cd_cvm, years in years_map.items()
        }

    @staticmethod
    def _normalize_refresh_status(value: Any) -> str:
        return str(value or "").strip().lower()

    def _resolve_refresh_tracking_state(
        self,
        row: dict[str, Any],
        *,
        active_job: dict[str, Any] | None,
        duration_profile: dict[str, Any] | None,
        has_readable_current_data: bool,
    ) -> str:
        last_status = self._normalize_refresh_status(row.get("last_status"))
        if last_status in {"success", "no_data", "error"}:
            return last_status

        active_state = (
            self._normalize_refresh_status(active_job.get("state"))
            if active_job is not None
            else ""
        )
        if active_state in self.ACTIVE_REFRESH_STATUSES:
            if self._is_refresh_tracking_stalled(
                row,
                active_job=active_job,
                duration_profile=duration_profile,
                active_state=active_state,
            ):
                return "stalled"
            return active_state

        if last_status in self.ACTIVE_REFRESH_STATUSES:
            return "stalled"

        return "success" if has_readable_current_data else "idle"

    def _is_refresh_tracking_stalled(
        self,
        row: dict[str, Any],
        *,
        active_job: dict[str, Any] | None,
        duration_profile: dict[str, Any] | None,
        active_state: str,
    ) -> bool:
        now = datetime.now(timezone.utc)
        if active_state == "running":
            activity_at = (
                self._parse_timestamp(active_job.get("heartbeat_at"))
                or self._parse_timestamp(active_job.get("started_at"))
                or self._parse_timestamp(row.get("heartbeat_at"))
                or self._parse_timestamp(row.get("started_at"))
                or self._parse_timestamp(active_job.get("requested_at"))
                or self._parse_timestamp(row.get("last_attempt_at"))
            )
            if activity_at is None:
                return False
            return (
                now - activity_at
            ).total_seconds() >= self.REFRESH_RUNNING_STALL_SECONDS

        if active_state == "queued":
            requested_at = (
                self._parse_timestamp(active_job.get("requested_at"))
                or self._parse_timestamp(row.get("last_attempt_at"))
            )
            if requested_at is None:
                return False
            queue_position = (
                int(row["queue_position"])
                if row.get("queue_position") is not None
                else 0
            )
            typical_total_seconds = int(
                round(
                    float(
                        (duration_profile or {}).get("typical_total_seconds")
                        or self.REFRESH_ESTIMATE_DEFAULT_TOTAL_SECONDS
                    )
                )
            )
            threshold_seconds = max(
                self.REFRESH_QUEUE_STALL_SECONDS,
                typical_total_seconds
                + 120
                + (min(max(queue_position, 0), 5) * self.REFRESH_QUEUE_POSITION_STEP_SECONDS),
            )
            return (
                now - requested_at
            ).total_seconds() >= threshold_seconds

        return False

    @staticmethod
    def _build_read_availability_summary(
        *,
        has_readable_current_data: bool,
        readable_years_count: int,
        latest_readable_year: int | None,
    ) -> dict[str, str]:
        if has_readable_current_data:
            if latest_readable_year is not None:
                return {
                    "code": "readable_history_available",
                    "message": (
                        f"Leitura anual disponivel ate {int(latest_readable_year)}."
                    ),
                }
            return {
                "code": "readable_history_available",
                "message": "Leitura anual disponivel nesta pagina.",
            }

        return {
            "code": "no_readable_annual_history",
            "message": (
                "Ainda nao ha historico anual legivel para esta companhia."
            ),
        }

    def _build_latest_attempt_reason(
        self,
        row: dict[str, Any],
        *,
        tracking_state: str,
        active_job: dict[str, Any] | None,
        has_readable_current_data: bool,
    ) -> dict[str, Any]:
        last_status = self._normalize_refresh_status(row.get("last_status"))
        progress_message = self._clean_optional_text(row.get("progress_message"))
        last_error = self._clean_optional_text(row.get("last_error"))
        normalized_progress_message = str(progress_message or "").lower()
        normalized_last_error = str(last_error or "").lower()

        if tracking_state == "queued":
            return {
                "code": "refresh_queued",
                "message": (
                    "Solicitacao recebida e aguardando processamento interno."
                ),
                "retryable": False,
            }

        if tracking_state == "running":
            return {
                "code": "refresh_running",
                "message": (
                    "Os demonstrativos desta companhia estao sendo atualizados agora."
                ),
                "retryable": False,
            }

        if tracking_state == "stalled":
            if active_job is None and last_status in self.ACTIVE_REFRESH_STATUSES:
                return {
                    "code": "refresh_tracking_lost",
                    "message": (
                        "A ultima solicitacao nao aparece mais como ativa."
                    ),
                    "retryable": True,
                }
            return {
                "code": "refresh_stalled",
                "message": (
                    "A solicitacao esta acima do esperado e sem sinais recentes de progresso."
                ),
                "retryable": active_job is None,
            }

        if last_status == "success":
            if "ja atualizada" in normalized_progress_message:
                return {
                    "code": "already_current",
                    "message": (
                        "Esta empresa ja estava atualizada para a janela padrao."
                    ),
                    "retryable": False,
                }
            if has_readable_current_data:
                return {
                    "code": "refresh_completed",
                    "message": "Dados prontos para leitura nesta pagina.",
                    "retryable": False,
                }
            return {
                "code": "refresh_completed_without_readable_data",
                "message": (
                    "A ultima atualizacao terminou, mas a leitura anual ainda nao ficou disponivel."
                ),
                "retryable": False,
            }

        if last_status == "no_data":
            if has_readable_current_data:
                return {
                    "code": "no_new_financial_history",
                    "message": (
                        "A ultima tentativa nao encontrou novos demonstrativos."
                    ),
                    "retryable": True,
                }
            return {
                "code": "no_annual_history",
                "message": (
                    "Nenhuma serie anual legivel foi encontrada para esta companhia."
                ),
                "retryable": True,
            }

        if last_status == "error":
            if "expirou" in normalized_progress_message:
                return {
                    "code": "refresh_expired",
                    "message": (
                        "A solicitacao expirou antes de terminar."
                    ),
                    "retryable": True,
                }
            if "no financial rows found" in normalized_last_error:
                return {
                    "code": "no_annual_history",
                    "message": (
                        "Nenhuma serie anual legivel foi encontrada para esta companhia."
                    ),
                    "retryable": True,
                }
            return {
                "code": "refresh_failed_retryable",
                "message": (
                    "Nao foi possivel concluir a atualizacao desta empresa agora."
                ),
                "retryable": True,
            }

        if has_readable_current_data:
            return {
                "code": "local_data_ready",
                "message": "Leitura local pronta para consulta.",
                "retryable": False,
            }

        return {
            "code": "no_local_history_yet",
            "message": (
                "Esta empresa ainda nao tem historico anual processado na base local."
            ),
            "retryable": False,
        }

    def _build_freshness_summary(
        self,
        row: dict[str, Any],
        *,
        tracking_state: str,
        has_readable_current_data: bool,
        status_reason_code: str,
        status_reason_message: str,
        latest_attempt_reason: dict[str, Any],
    ) -> dict[str, str]:
        last_status = self._normalize_refresh_status(row.get("last_status"))
        attempt_code = str(latest_attempt_reason.get("code") or "")

        if tracking_state in {"queued", "running"}:
            return {
                "code": status_reason_code,
                "message": status_reason_message,
                "severity": "info",
            }

        if tracking_state == "stalled":
            if has_readable_current_data:
                return {
                    "code": "mixed_refresh_stalled_readable",
                    "message": (
                        "A leitura atual continua disponivel, mas a ultima solicitacao esta sem sinais recentes."
                    ),
                    "severity": "warning",
                }
            return {
                "code": "refresh_stalled_no_readable",
                "message": (
                    "A solicitacao esta sem sinais recentes e ainda nao ha leitura anual disponivel."
                ),
                "severity": "warning",
            }

        if last_status == "success":
            if attempt_code == "already_current":
                return {
                    "code": "already_current",
                    "message": (
                        "A leitura local ja estava atualizada para a janela padrao."
                    ),
                    "severity": "success",
                }
            if has_readable_current_data:
                return {
                    "code": "refresh_completed_readable",
                    "message": "Dados prontos para leitura nesta pagina.",
                    "severity": "success",
                }
            return {
                "code": "refresh_completed_no_readable",
                "message": (
                    "A atualizacao terminou, mas a leitura anual ainda nao esta disponivel."
                ),
                "severity": "warning",
            }

        if last_status == "no_data":
            if has_readable_current_data:
                return {
                    "code": "mixed_no_new_data_readable",
                    "message": (
                        "A ultima tentativa nao encontrou novos demonstrativos; a leitura atual continua disponivel."
                    ),
                    "severity": "info",
                }
            return {
                "code": "no_annual_history",
                "message": (
                    "Nenhuma serie anual legivel foi encontrada para esta companhia."
                ),
                "severity": "info",
            }

        if last_status == "error":
            if has_readable_current_data:
                return {
                    "code": "mixed_retryable_error_readable",
                    "message": (
                        "A leitura atual continua disponivel, mas a ultima atualizacao falhou e pode ser tentada novamente."
                    ),
                    "severity": "warning",
                }
            return {
                "code": "refresh_failed_retryable",
                "message": (
                    "A ultima atualizacao falhou e ainda nao ha leitura anual disponivel."
                ),
                "severity": "error",
            }

        if has_readable_current_data:
            return {
                "code": "readable_history_available",
                "message": "Leitura local pronta para consulta.",
                "severity": "success",
            }

        return {
            "code": "no_readable_annual_history",
            "message": (
                "Ainda nao ha historico anual legivel para esta companhia."
            ),
            "severity": "info",
        }

    def _build_refresh_status_reason(
        self,
        row: dict[str, Any],
        *,
        tracking_state: str,
        active_job: dict[str, Any] | None,
        has_readable_current_data: bool,
    ) -> tuple[str, str]:
        last_status = self._normalize_refresh_status(row.get("last_status"))
        progress_message = self._clean_optional_text(row.get("progress_message"))
        last_error = self._clean_optional_text(row.get("last_error"))
        normalized_progress_message = str(progress_message or "").lower()
        normalized_last_error = str(last_error or "").lower()

        if tracking_state == "queued":
            return (
                "refresh_queued",
                "Solicitacao recebida e aguardando processamento interno.",
            )

        if tracking_state == "running":
            return (
                "refresh_running",
                "Os demonstrativos desta companhia estao sendo atualizados agora.",
            )

        if tracking_state == "stalled":
            if active_job is None and last_status in self.ACTIVE_REFRESH_STATUSES:
                return (
                    "refresh_tracking_lost",
                    "A ultima solicitacao nao aparece mais como ativa. Atualize o status ou tente novamente.",
                )
            return (
                "refresh_stalled",
                "A solicitacao esta acima do esperado e sem sinais recentes de progresso.",
            )

        if last_status == "success":
            if "ja atualizada" in normalized_progress_message:
                return (
                    "already_current",
                    "Esta empresa ja estava atualizada para a janela padrao.",
                )
            if has_readable_current_data:
                return (
                    "refresh_completed",
                    "Dados prontos para leitura nesta pagina.",
                )
            return ("refresh_completed", "Processamento concluido.")

        if last_status == "no_data":
            if has_readable_current_data:
                return (
                    "no_new_financial_history",
                    "A ultima tentativa nao encontrou novos demonstrativos, mas a leitura atual continua disponivel.",
                )
            return (
                "no_financial_history_found",
                "Ainda nao foi encontrada uma serie anual suficiente para liberar esta leitura.",
            )

        if last_status == "error":
            if "expirou" in normalized_progress_message:
                return (
                    "refresh_stalled",
                    "A solicitacao expirou antes de terminar. Voce pode tentar novamente.",
                )
            if "no financial rows found" in normalized_last_error:
                return (
                    "no_financial_history_found",
                    "Nenhuma serie anual utilizavel foi encontrada para esta empresa.",
                )
            return (
                "refresh_failed",
                "Nao foi possivel concluir a atualizacao desta empresa agora.",
            )

        if has_readable_current_data:
            return ("local_data_ready", "Leitura local pronta para consulta.")

        return (
            "no_local_history_yet",
            "Esta empresa ainda nao tem historico anual processado na base local.",
        )

    @staticmethod
    def _build_refresh_source_label(
        source_scope: Any,
        *,
        has_readable_current_data: bool,
    ) -> str:
        normalized_scope = str(source_scope or "").strip().lower()
        if normalized_scope == "local":
            return (
                "Base local materializada"
                if has_readable_current_data
                else "Base local"
            )
        if normalized_scope == "on_demand":
            return "Solicitacao on-demand"
        if normalized_scope == "on_demand_bootstrap":
            return "Primeira carga on-demand"
        if normalized_scope == "ranked_backfill":
            return "Backfill historico"
        return "Leitura CVM processada"

    @staticmethod
    def _is_refresh_retry_allowed(
        *,
        tracking_state: str,
        active_job: dict[str, Any] | None,
    ) -> bool:
        if tracking_state in {"no_data", "error"}:
            return True
        return tracking_state == "stalled" and active_job is None

    def _load_refresh_status_map(
        self,
        cd_cvms: list[int] | None = None,
    ) -> dict[int, dict[str, Any]]:
        if not inspect(self.engine).has_table("company_refresh_status"):
            return {}

        if cd_cvms:
            query = text(
                """
                SELECT *
                FROM company_refresh_status
                WHERE cd_cvm IN :cd_cvms
                """
            ).bindparams(bindparam("cd_cvms", expanding=True))
            params = {"cd_cvms": [int(cd_cvm) for cd_cvm in cd_cvms]}
        else:
            query = text("SELECT * FROM company_refresh_status")
            params = {}

        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()
        return {int(row["cd_cvm"]): dict(row) for row in rows}

    def _load_active_refresh_jobs_map(
        self,
        cd_cvms: list[int] | None = None,
    ) -> dict[int, dict[str, Any]]:
        if not inspect(self.engine).has_table("refresh_jobs"):
            return {}

        if cd_cvms:
            query = text(
                """
                SELECT *
                FROM refresh_jobs
                WHERE state IN ('queued', 'running')
                  AND cd_cvm IN :cd_cvms
                ORDER BY
                    CASE WHEN state = 'running' THEN 0 ELSE 1 END,
                    requested_at ASC,
                    id ASC
                """
            ).bindparams(bindparam("cd_cvms", expanding=True))
            params = {"cd_cvms": [int(cd_cvm) for cd_cvm in cd_cvms]}
        else:
            query = text(
                """
                SELECT *
                FROM refresh_jobs
                WHERE state IN ('queued', 'running')
                ORDER BY
                    CASE WHEN state = 'running' THEN 0 ELSE 1 END,
                    requested_at ASC,
                    id ASC
                """
            )
            params = {}

        with self.engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()

        active_jobs: dict[int, dict[str, Any]] = {}
        for row in rows:
            cd_cvm = int(row["cd_cvm"])
            if cd_cvm not in active_jobs:
                active_jobs[cd_cvm] = dict(row)
        return active_jobs

    def _default_refresh_year_span(self) -> int:
        start_year, end_year = self._resolve_refresh_range(
            start_year=2010,
            end_year=None,
        )
        return max(1, int(end_year) - int(start_year) + 1)

    def _refresh_year_span(self, row: dict[str, Any]) -> int:
        start_year = row.get("last_start_year")
        end_year = row.get("last_end_year")
        if start_year is None or end_year is None:
            return self._default_refresh_year_span()
        try:
            year_span = int(end_year) - int(start_year) + 1
        except (TypeError, ValueError):
            return self._default_refresh_year_span()
        return max(1, year_span)

    def _estimate_refresh_duration_profile(self) -> dict[str, Any]:
        typical_year_span = float(self._default_refresh_year_span())
        year_span_samples = 0

        if inspect(self.engine).has_table("company_refresh_status"):
            query = text(
                """
                SELECT last_start_year, last_end_year
                FROM company_refresh_status
                WHERE last_status = 'success'
                  AND last_start_year IS NOT NULL
                  AND last_end_year IS NOT NULL
                ORDER BY last_success_at DESC
                LIMIT 200
                """
            )
            with self.engine.connect() as conn:
                rows = conn.execute(query).mappings().all()

            year_spans = []
            for row in rows:
                try:
                    year_span = int(row["last_end_year"]) - int(row["last_start_year"]) + 1
                except (TypeError, ValueError):
                    continue
                if year_span > 0:
                    year_spans.append(year_span)

            if year_spans:
                typical_year_span = float(median(year_spans))
                year_span_samples = len(year_spans)

        throughput = self._estimate_refresh_throughput()
        per_hour = throughput.get("per_hour")
        typical_total_seconds = (
            max(60.0, 3600.0 / float(per_hour))
            if per_hour
            else float(self.REFRESH_ESTIMATE_DEFAULT_TOTAL_SECONDS)
        )

        return {
            "typical_year_span": max(1.0, typical_year_span),
            "typical_total_seconds": float(typical_total_seconds),
            "sample_size": max(
                int(throughput.get("sample_size") or 0),
                int(year_span_samples),
            ),
            "confidence": str(throughput.get("confidence") or "low"),
        }

    def _estimate_refresh_runtime(
        self,
        row: dict[str, Any],
        *,
        duration_profile: dict[str, Any] | None,
        active_job: dict[str, Any] | None,
        tracking_state: str,
    ) -> dict[str, Any]:
        active_state = (
            self._normalize_refresh_status(active_job.get("state"))
            if active_job is not None
            else self._normalize_refresh_status(row.get("last_status"))
        )
        if tracking_state not in {"queued", "running", "stalled"}:
            return {
                "estimated_progress_pct": None,
                "estimated_eta_seconds": None,
                "estimated_total_seconds": None,
                "elapsed_seconds": None,
                "estimated_completion_at": None,
                "estimate_confidence": None,
                "progress_mode": "none",
            }

        real_progress_estimate = self._estimate_refresh_runtime_from_real_progress(
            row,
            tracking_state=tracking_state,
        )
        if real_progress_estimate is not None:
            return real_progress_estimate

        attempted_at = (
            self._parse_timestamp(row.get("started_at"))
            or self._parse_timestamp(row.get("last_attempt_at"))
            or (
                self._parse_timestamp(active_job.get("requested_at"))
                if active_job is not None
                else None
            )
        )
        now = datetime.now(timezone.utc)
        elapsed_seconds = (
            max(0, int(round((now - attempted_at).total_seconds())))
            if attempted_at is not None
            else None
        )

        if active_state == "queued" and tracking_state != "running":
            queue_position = (
                int(row["queue_position"])
                if row.get("queue_position") is not None
                else 0
            )
            estimated_progress_pct = min(
                32.0,
                self.REFRESH_QUEUE_PROGRESS_BASE
                + (min(max(queue_position, 0), 4) * self.REFRESH_QUEUE_PROGRESS_STEP),
            )
            if tracking_state == "stalled":
                estimated_progress_pct = max(estimated_progress_pct, 22.0)
            return {
                "estimated_progress_pct": round(float(estimated_progress_pct), 1),
                "estimated_eta_seconds": None,
                "estimated_total_seconds": None,
                "elapsed_seconds": elapsed_seconds,
                "estimated_completion_at": None,
                "estimate_confidence": "low",
                "progress_mode": "stalled" if tracking_state == "stalled" else "queue",
            }

        profile = duration_profile or self._estimate_refresh_duration_profile()
        typical_year_span = max(
            1.0,
            float(profile.get("typical_year_span") or self._default_refresh_year_span()),
        )
        current_year_span = float(self._refresh_year_span(row))
        typical_total_seconds = max(
            60.0,
            float(
                profile.get("typical_total_seconds")
                or self.REFRESH_ESTIMATE_DEFAULT_TOTAL_SECONDS
            ),
        )
        estimated_total_seconds = max(
            60,
            int(round(typical_total_seconds * (current_year_span / typical_year_span))),
        )
        estimated_completion_at = (
            (
                attempted_at + timedelta(seconds=estimated_total_seconds)
                if attempted_at is not None
                else now + timedelta(seconds=estimated_total_seconds)
            )
            .replace(microsecond=0)
            .isoformat()
        )

        if elapsed_seconds is None:
            estimated_progress_pct = self.REFRESH_ESTIMATE_PROGRESS_FLOOR
            estimated_eta_seconds = estimated_total_seconds
        else:
            ratio = float(elapsed_seconds) / float(estimated_total_seconds)
            estimated_progress_pct = self.REFRESH_ESTIMATE_PROGRESS_FLOOR + (
                min(1.0, ratio)
                * (
                    self.REFRESH_ESTIMATE_PROGRESS_CEILING
                    - self.REFRESH_ESTIMATE_PROGRESS_FLOOR
                )
            )
            if ratio > 1.0:
                estimated_progress_pct = min(
                    self.REFRESH_RUNNING_PROGRESS_CAP,
                    estimated_progress_pct + min(6.0, (ratio - 1.0) * 10.0),
                )
            estimated_eta_seconds = max(0, estimated_total_seconds - elapsed_seconds)

        if active_state == "running":
            estimated_progress_pct = max(estimated_progress_pct, 28.0)

        if tracking_state == "stalled":
            return {
                "estimated_progress_pct": round(float(estimated_progress_pct), 1),
                "estimated_eta_seconds": None,
                "estimated_total_seconds": int(estimated_total_seconds),
                "elapsed_seconds": elapsed_seconds,
                "estimated_completion_at": None,
                "estimate_confidence": str(profile.get("confidence") or "low"),
                "progress_mode": "stalled",
            }

        return {
            "estimated_progress_pct": round(float(estimated_progress_pct), 1),
            "estimated_eta_seconds": int(estimated_eta_seconds),
            "estimated_total_seconds": int(estimated_total_seconds),
            "elapsed_seconds": elapsed_seconds,
            "estimated_completion_at": estimated_completion_at,
            "estimate_confidence": str(profile.get("confidence") or "low"),
            "progress_mode": "time_window",
        }

    def _estimate_refresh_runtime_from_real_progress(
        self,
        row: dict[str, Any],
        *,
        tracking_state: str,
    ) -> dict[str, Any] | None:
        stage = str(row.get("stage") or "").strip().lower()
        if stage not in REFRESH_STAGE_WEIGHTS:
            return None

        raw_total = row.get("progress_total")
        raw_current = row.get("progress_current")
        total = max(1, int(raw_total or 1))
        current = max(0, min(total, int(raw_current or 0)))

        completed_before_stage = 0.0
        for stage_name in REFRESH_STAGE_ORDER:
            if stage_name == stage:
                break
            completed_before_stage += float(REFRESH_STAGE_WEIGHTS[stage_name])

        stage_weight = float(REFRESH_STAGE_WEIGHTS[stage])
        stage_ratio = min(1.0, max(0.0, float(current) / float(total)))
        progress_pct = completed_before_stage + (stage_weight * stage_ratio)
        progress_pct = max(0.0, min(100.0, progress_pct))

        started_at = self._parse_timestamp(row.get("started_at")) or self._parse_timestamp(
            row.get("last_attempt_at")
        )
        now = datetime.now(timezone.utc)
        elapsed_seconds = (
            max(0, int(round((now - started_at).total_seconds())))
            if started_at is not None
            else None
        )

        estimated_total_seconds: int | None = None
        estimated_eta_seconds: int | None = None
        estimated_completion_at: str | None = None
        if elapsed_seconds is not None and progress_pct > 0.0:
            progress_ratio = min(1.0, max(0.0001, progress_pct / 100.0))
            if progress_ratio >= 1.0:
                estimated_total_seconds = elapsed_seconds
                estimated_eta_seconds = 0
                estimated_completion_at = now.replace(microsecond=0).isoformat()
            else:
                estimated_total_seconds = max(
                    elapsed_seconds,
                    int(round(float(elapsed_seconds) / progress_ratio)),
                )
                estimated_eta_seconds = max(
                    0,
                    int(estimated_total_seconds) - int(elapsed_seconds),
                )
                estimated_completion_at = (
                    started_at + timedelta(seconds=int(estimated_total_seconds))
                ).replace(microsecond=0).isoformat()

        if tracking_state == "stalled":
            estimated_eta_seconds = None
            estimated_completion_at = None

        return {
            "estimated_progress_pct": round(float(progress_pct), 1),
            "estimated_eta_seconds": estimated_eta_seconds,
            "estimated_total_seconds": estimated_total_seconds,
            "elapsed_seconds": elapsed_seconds,
            "estimated_completion_at": estimated_completion_at,
            "estimate_confidence": "high",
            "progress_mode": (
                "stalled" if tracking_state == "stalled" else "real_progress"
            ),
        }

    def _estimate_refresh_throughput(self) -> dict[str, Any]:
        if not inspect(self.engine).has_table("company_refresh_status"):
            return {"per_hour": None, "sample_size": 0, "confidence": "low"}

        query = text(
            """
            SELECT last_success_at
            FROM company_refresh_status
            WHERE last_status = 'success'
              AND last_success_at IS NOT NULL
            ORDER BY last_success_at DESC
            LIMIT 200
            """
        )
        with self.engine.connect() as conn:
            rows = conn.execute(query).mappings().all()

        parsed = [
            timestamp
            for timestamp in (
                self._parse_timestamp(row.get("last_success_at"))
                for row in rows
            )
            if timestamp is not None
        ]
        if not parsed:
            return {"per_hour": None, "sample_size": 0, "confidence": "low"}

        recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=self.THROUGHPUT_WINDOW_HOURS)
        recent = sorted(timestamp for timestamp in parsed if timestamp >= recent_cutoff)
        if len(recent) < self.THROUGHPUT_MIN_SUCCESS_SAMPLES:
            return {"per_hour": None, "sample_size": len(recent), "confidence": "low"}

        span_hours = (recent[-1] - recent[0]).total_seconds() / 3600.0
        if span_hours <= 0:
            return {"per_hour": None, "sample_size": len(recent), "confidence": "low"}

        per_hour = max(0.0, (len(recent) - 1) / span_hours)
        confidence = "high" if len(recent) >= 12 and span_hours >= 6 else "medium"
        return {
            "per_hour": float(per_hour) if per_hour > 0 else None,
            "sample_size": len(recent),
            "confidence": confidence if per_hour > 0 else "low",
        }

    def _ensure_refresh_status_table(self, conn) -> None:
        ensure_refresh_runtime_tables_for_connection(conn)

    @staticmethod
    def _parse_timestamp(value: Any) -> datetime | None:
        if value is None:
            return None
        raw_value = str(value).strip()
        if not raw_value:
            return None
        try:
            parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    def _is_recently_queued(
        self,
        status_row: dict[str, Any] | Any,
        *,
        window: timedelta,
    ) -> bool:
        if not status_row:
            return False
        last_status = (
            str(status_row.get("last_status") or "").strip().lower()
            if hasattr(status_row, "get")
            else str(getattr(status_row, "last_status", "") or "").strip().lower()
        )
        if last_status != "queued":
            return False
        last_attempt_at = (
            status_row.get("last_attempt_at")
            if hasattr(status_row, "get")
            else getattr(status_row, "last_attempt_at", None)
        )
        attempted_at = self._parse_timestamp(last_attempt_at)
        if attempted_at is None:
            return False
        return (datetime.now(timezone.utc) - attempted_at) < window

    def _priority_score(
        self,
        *,
        coverage_rank: int | None,
        missing_years_count: int,
        gap_to_leader_years: int,
    ) -> int:
        normalized_rank = coverage_rank if coverage_rank is not None else 999
        rank_score = max(0, 81 - int(normalized_rank)) * 100
        return int(rank_score + (int(missing_years_count) * 25) + (int(gap_to_leader_years) * 10))

    def _risk_level(
        self,
        *,
        coverage_rank: int | None,
        missing_years_count: int,
        excluded_from_queue: bool,
    ) -> str:
        if excluded_from_queue:
            return "alto"
        if missing_years_count <= 0:
            return "baixo"
        if coverage_rank is not None and coverage_rank <= 20:
            return "alto"
        if coverage_rank is not None and coverage_rank <= 50:
            return "medio"
        if missing_years_count >= 3:
            return "medio"
        return "baixo"

    def _health_status_from_score(self, score: float) -> str:
        if score >= self.BASE_HEALTH_OK_THRESHOLD:
            return "ok"
        if score >= self.BASE_HEALTH_CRITICAL_THRESHOLD:
            return "atencao"
        return "critico"

    def _build_company_results(self, df: pd.DataFrame) -> list[CompanySearchResult]:
        results = []
        if df is None or df.empty:
            return results

        for _, row in df.iterrows():
            setor_analitico = self._clean_optional_text(row.get("setor_analitico"))
            setor_cvm = self._clean_optional_text(row.get("setor_cvm"))
            raw_sector_name = self._clean_optional_text(row.get("sector_name"))
            sector_name = raw_sector_name or canonical_sector_name(setor_analitico, setor_cvm)
            raw_coverage_rank = row.get("coverage_rank")
            results.append(
                CompanySearchResult(
                    cd_cvm=int(row["cd_cvm"]),
                    company_name=str(row["company_name"]),
                    ticker_b3=self._clean_optional_text(row.get("ticker_b3")),
                    setor_analitico=setor_analitico,
                    setor_cvm=setor_cvm,
                    sector_name=sector_name,
                    sector_slug=sector_slugify(sector_name),
                    anos_disponiveis=_parse_years(row.get("anos_disponiveis")),
                    total_rows=int(row.get("total_rows") or 0),
                    has_financial_data=bool(int(row.get("has_financial_data") or 0)),
                    coverage_rank=int(raw_coverage_rank) if raw_coverage_rank is not None and str(raw_coverage_rank) != "nan" else None,
                )
            )
        return results

    @staticmethod
    def _clean_optional_text(value: Any) -> str | None:
        if value is None:
            return None
        if pd.isna(value):
            return None
        text_value = str(value).strip()
        return text_value or None

    def _resolve_sector_slug(self, sector_slug: str | None) -> str | None:
        if not sector_slug:
            return None
        normalized_slug = str(sector_slug).strip().lower()
        if not normalized_slug:
            return None
        for option in self.get_company_filters().sectors:
            if option.sector_slug == normalized_slug:
                return option.sector_name
        return None

    @staticmethod
    def _extract_years_from_company_rows(df: pd.DataFrame) -> list[int]:
        years: set[int] = set()
        if df is None or df.empty:
            return []
        for raw_years in df.get("anos_disponiveis", []):
            years.update(_parse_years(raw_years))
        return sorted(years)

    @staticmethod
    def _aggregate_sector_yearly_metrics(metric_rows: pd.DataFrame) -> pd.DataFrame:
        if metric_rows is None or metric_rows.empty:
            return pd.DataFrame(columns=["sector_name", "year", "roe", "mg_ebit", "mg_liq"])

        aggregated = (
            metric_rows.groupby(["sector_name", "report_year"], dropna=False)[["roe", "mg_ebit", "mg_liq"]]
            .mean()
            .reset_index()
            .rename(columns={"report_year": "year"})
        )
        return aggregated

    @staticmethod
    def _coerce_optional_float(value: Any) -> float | None:
        if value is None or pd.isna(value):
            return None
        return float(value)

    @staticmethod
    def _empty_company_page(
        *,
        search: str,
        sector_slug: str | None,
        page: int,
        page_size: int,
    ) -> CompanyDirectoryPage:
        return CompanyDirectoryPage(
            items=(),
            pagination=CompanyDirectoryPagination(
                page=int(page),
                page_size=int(page_size),
                total_items=0,
                total_pages=1,
                has_next=False,
                has_previous=int(page) > 1,
            ),
            applied_filters=CompanyDirectoryAppliedFilters(
                search=str(search or ""),
                sector=sector_slug,
            ),
        )
