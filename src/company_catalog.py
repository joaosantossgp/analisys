from __future__ import annotations

import io
import threading
import time
from dataclasses import dataclass

import pandas as pd
import requests

from src.ticker_map import TICKER_MAP

CVM_MASTER_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv"
ACTIVE_STATUS_VALUES = {"ATIVO", "A"}
DEFAULT_CATALOG_TTL_SECONDS = 900


class CompanyCatalogUnavailableError(RuntimeError):
    """Raised when the remote CVM company catalog cannot be consulted."""


def _normalize_display_ticker(value: str | None) -> str | None:
    if not value:
        return None
    normalized = str(value).strip().upper()
    if normalized.endswith(".SA"):
        normalized = normalized[:-3]
    return normalized or None


@dataclass(frozen=True)
class CompanyCatalogEntry:
    cd_cvm: int
    company_name: str
    nome_comercial: str | None
    cnpj: str | None
    setor_cvm: str | None
    ticker_b3: str | None
    is_active: bool


@dataclass(frozen=True)
class CompanyCatalogSnapshot:
    entries: tuple[CompanyCatalogEntry, ...]
    by_cd_cvm: dict[int, CompanyCatalogEntry]


class CompanyCatalogService:
    def __init__(
        self,
        *,
        timeout: int,
        ttl_seconds: int = DEFAULT_CATALOG_TTL_SECONDS,
    ) -> None:
        self.timeout = int(timeout)
        self.ttl_seconds = int(ttl_seconds)
        self._cache_lock = threading.Lock()
        self._cached_snapshot: CompanyCatalogSnapshot | None = None
        self._cached_at = 0.0

    def lookup_company(self, cd_cvm: int) -> CompanyCatalogEntry | None:
        snapshot = self._load_snapshot()
        return snapshot.by_cd_cvm.get(int(cd_cvm))

    def search_companies(
        self,
        *,
        q: str,
        limit: int,
        exclude_codes: set[int] | None = None,
    ) -> tuple[CompanyCatalogEntry, ...]:
        normalized_query = str(q or "").strip().lower()
        if not normalized_query or int(limit) <= 0:
            return ()

        excluded = exclude_codes or set()
        snapshot = self._load_snapshot()
        matches: list[tuple[tuple[int, int, str], CompanyCatalogEntry]] = []

        for entry in snapshot.entries:
            if entry.cd_cvm in excluded:
                continue

            company_name = entry.company_name.lower()
            trade_name = (entry.nome_comercial or "").lower()
            ticker = (entry.ticker_b3 or "").lower()
            code = str(entry.cd_cvm)

            names = [value for value in (company_name, trade_name) if value]
            rank: int | None = None

            if ticker == normalized_query or code == normalized_query:
                rank = 0
            elif any(value.startswith(normalized_query) for value in names):
                rank = 1
            elif ticker.startswith(normalized_query):
                rank = 2
            elif (
                any(normalized_query in value for value in names)
                or normalized_query in ticker
                or normalized_query in code
            ):
                rank = 3

            if rank is None:
                continue

            display_name = trade_name or company_name
            matches.append(
                (
                    (rank, 0 if entry.is_active else 1, display_name),
                    entry,
                )
            )

        matches.sort(key=lambda item: item[0])
        return tuple(entry for _, entry in matches[: int(limit)])

    def _load_snapshot(self) -> CompanyCatalogSnapshot:
        now = time.monotonic()
        with self._cache_lock:
            if (
                self._cached_snapshot is not None
                and (now - self._cached_at) < self.ttl_seconds
            ):
                return self._cached_snapshot

        try:
            response = requests.get(CVM_MASTER_URL, timeout=self.timeout)
            response.raise_for_status()
            raw_df = pd.read_csv(
                io.BytesIO(response.content),
                sep=";",
                encoding="latin1",
                usecols=[
                    "CD_CVM",
                    "DENOM_SOCIAL",
                    "DENOM_COMERC",
                    "CNPJ_CIA",
                    "SETOR_ATIV",
                    "SIT",
                ],
                dtype={"CD_CVM": str, "CNPJ_CIA": str},
            )
        except Exception as exc:
            raise CompanyCatalogUnavailableError(
                "Nao foi possivel consultar o catalogo CVM agora."
            ) from exc

        snapshot = self._build_snapshot(raw_df)
        with self._cache_lock:
            self._cached_snapshot = snapshot
            self._cached_at = time.monotonic()
            return snapshot

    @staticmethod
    def _build_snapshot(raw_df: pd.DataFrame) -> CompanyCatalogSnapshot:
        df = raw_df.copy()
        df["CD_CVM"] = pd.to_numeric(df["CD_CVM"], errors="coerce")
        df = df.dropna(subset=["CD_CVM"]).copy()
        df["CD_CVM"] = df["CD_CVM"].astype(int)
        df["DENOM_SOCIAL"] = df["DENOM_SOCIAL"].fillna("").astype(str).str.strip()
        df["DENOM_COMERC"] = df["DENOM_COMERC"].fillna("").astype(str).str.strip()
        df["SETOR_ATIV"] = df["SETOR_ATIV"].fillna("").astype(str).str.strip()
        df["CNPJ_CIA"] = df["CNPJ_CIA"].fillna("").astype(str).str.strip()
        df["SIT"] = df["SIT"].fillna("").astype(str).str.strip().str.upper()
        df = df.drop_duplicates(subset="CD_CVM").sort_values("DENOM_SOCIAL")

        entries: list[CompanyCatalogEntry] = []
        by_cd_cvm: dict[int, CompanyCatalogEntry] = {}

        for _, row in df.iterrows():
            cd_cvm = int(row["CD_CVM"])
            company_name = str(row["DENOM_SOCIAL"]).strip() or f"CVM_{cd_cvm}"
            nome_comercial = str(row["DENOM_COMERC"]).strip() or None
            setor_cvm = str(row["SETOR_ATIV"]).strip() or None
            cnpj = str(row["CNPJ_CIA"]).strip() or None
            ticker_b3 = _normalize_display_ticker(TICKER_MAP.get(cd_cvm))
            entry = CompanyCatalogEntry(
                cd_cvm=cd_cvm,
                company_name=company_name,
                nome_comercial=nome_comercial,
                cnpj=cnpj,
                setor_cvm=setor_cvm,
                ticker_b3=ticker_b3,
                is_active=str(row["SIT"]).upper() in ACTIVE_STATUS_VALUES,
            )
            entries.append(entry)
            by_cd_cvm[cd_cvm] = entry

        return CompanyCatalogSnapshot(entries=tuple(entries), by_cd_cvm=by_cd_cvm)
