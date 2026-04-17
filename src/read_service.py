from __future__ import annotations

import io
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd
from sqlalchemy import bindparam, inspect, text

from desktop.services import IntelligentSelectorService
from src.contracts import (
    CompanyDirectoryAppliedFilters,
    CompanyDirectoryPage,
    CompanyDirectoryPagination,
    CompanyFiltersDTO,
    CompanyInfoDTO,
    CompanySectorFilterOption,
    CompanySearchResult,
    HealthSnapshot,
    KPIBundle,
    RankedRefreshQueueItem,
    RankedRefreshQueueResult,
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
from src.statement_summary import build_general_summary_blocks
from src.db import build_engine
from src.excel_exporter import ExcelExporter, build_excel_filename
from src.kpi_engine import compute_all_kpis, compute_quarterly_kpis
from src.query_layer import CVMQueryLayer
from src.sector_taxonomy import canonical_sector_name, sector_slugify
from src.settings import AppSettings, get_settings

EXPORT_STATEMENT_TYPES = ("DRE", "BPA", "BPP", "DFC", "DVA", "DMPL")


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

    def __init__(self, settings: AppSettings | None = None):
        self.settings = settings or get_settings()
        self.engine = build_engine(self.settings)
        self.query_layer = CVMQueryLayer(engine=self.engine)
        self.operational_service = IntelligentSelectorService(settings=self.settings)

    def search_companies(self, search: str = "") -> list[CompanySearchResult]:
        df = self.query_layer.get_companies(search)
        return self._build_company_results(df)

    def search_companies_df(self, search: str = "") -> pd.DataFrame:
        rows = [row.to_dict() for row in self.search_companies(search)]
        return pd.DataFrame(rows)

    def get_company_info(self, cd_cvm: int) -> CompanyInfoDTO | None:
        payload = self.query_layer.get_company_info(cd_cvm)
        if not payload:
            return None
        sector_name = canonical_sector_name(payload.get("setor_analitico"), payload.get("setor_cvm"))
        return CompanyInfoDTO(
            cd_cvm=int(payload.get("cd_cvm") or cd_cvm),
            company_name=str(payload.get("company_name") or ""),
            nome_comercial=payload.get("nome_comercial"),
            cnpj=payload.get("cnpj"),
            setor_cvm=payload.get("setor_cvm"),
            setor_analitico=payload.get("setor_analitico"),
            sector_name=sector_name,
            sector_slug=sector_slugify(sector_name),
            company_type=payload.get("company_type"),
            ticker_b3=payload.get("ticker_b3"),
        )

    def get_company_info_dict(self, cd_cvm: int) -> dict[str, Any]:
        info = self.get_company_info(cd_cvm)
        return info.to_dict() if info else {}

    def get_available_years(self, cd_cvm: int) -> list[int]:
        return self.query_layer.get_available_years(cd_cvm)

    def get_available_statements(self, cd_cvm: int) -> list[str]:
        return self.query_layer.get_available_statements(cd_cvm)

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

    def resolve_sector_slug(self, sector_slug: str | None) -> str | None:
        return self._resolve_sector_slug(sector_slug)

    def list_sectors(self) -> SectorDirectoryDTO:
        sectors_df = self.query_layer.get_available_company_sectors()
        companies_df = self.query_layer.get_companies()
        metric_rows = self.query_layer.get_sector_metric_rows()
        yearly = self._aggregate_sector_yearly_metrics(metric_rows)

        items: list[SectorDirectoryItemDTO] = []
        for _, row in sectors_df.iterrows():
            sector_name = str(row["sector_name"])
            sector_companies = companies_df[companies_df["sector_name"] == sector_name]
            available_years = self._extract_years_from_company_rows(sector_companies)
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

        company_rows, total_items = self.query_layer.get_companies_directory_page(
            search="",
            sector_name=resolved_sector_name,
            page=1,
            page_size=None,
        )
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
        if not inspect(self.engine).has_table("company_refresh_status"):
            return []

        query = text(
            """
            SELECT
                cd_cvm,
                company_name,
                source_scope,
                last_attempt_at,
                last_success_at,
                last_status,
                last_error,
                last_start_year,
                last_end_year,
                last_rows_inserted,
                updated_at
            FROM company_refresh_status
            WHERE (:cd_cvm IS NULL OR cd_cvm = :cd_cvm)
            ORDER BY company_name
            """
        )
        with self.engine.connect() as conn:
            rows = conn.execute(query, {"cd_cvm": int(cd_cvm) if cd_cvm is not None else None}).mappings().all()
        return [
            RefreshStatusDTO(
                cd_cvm=int(row["cd_cvm"]),
                company_name=str(row["company_name"] or ""),
                source_scope=row.get("source_scope"),
                last_attempt_at=row.get("last_attempt_at"),
                last_success_at=row.get("last_success_at"),
                last_status=row.get("last_status"),
                last_error=row.get("last_error"),
                last_start_year=int(row["last_start_year"]) if row.get("last_start_year") is not None else None,
                last_end_year=int(row["last_end_year"]) if row.get("last_end_year") is not None else None,
                last_rows_inserted=int(row["last_rows_inserted"]) if row.get("last_rows_inserted") is not None else None,
                updated_at=row.get("updated_at"),
            )
            for row in rows
        ]

    def request_company_refresh(self, cd_cvm: int) -> str:
        """Dispatch on-demand ingest for one company.

        Returns one of: "dispatched", "dispatch_failed", "already_queued".
        Raises NotFoundError if cd_cvm is unknown.
        """
        start_year, end_year = self._resolve_refresh_range(start_year=2010, end_year=None)
        return self._dispatch_refresh_request(
            cd_cvm=cd_cvm,
            start_year=start_year,
            end_year=end_year,
            source_scope="on_demand",
            already_queued_window=timedelta(minutes=self.RANKED_REFRESH_QUEUE_WINDOW_MINUTES),
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
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS company_refresh_status (
                    cd_cvm INTEGER PRIMARY KEY,
                    company_name TEXT,
                    source_scope TEXT NOT NULL DEFAULT 'local',
                    last_attempt_at TEXT,
                    last_success_at TEXT,
                    last_status TEXT,
                    last_error TEXT,
                    last_start_year INTEGER,
                    last_end_year INTEGER,
                    last_rows_inserted INTEGER,
                    updated_at TEXT
                )
                """
            )
        )

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
