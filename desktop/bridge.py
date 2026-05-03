"""
CVMBridge — funções Python expostas ao JS via window.pywebview.api.*

Convenção pywebview: objetos JS chegam como dict posicional (params=None),
não como kwargs. Use sempre `def method(self, params=None)` + `params.get(...)`.
"""

from __future__ import annotations

import dataclasses
import time
from typing import Any


class CVMBridge:
    def __init__(self) -> None:
        self._service = None
        self._refresh_manager = None

    def _svc(self):
        if self._service is None:
            from src.read_service import CVMReadService  # noqa: PLC0415
            self._service = CVMReadService()
        return self._service

    def _refresh(self):
        if self._refresh_manager is None:
            from desktop.services import DesktopRefreshJobManager  # noqa: PLC0415

            self._refresh_manager = DesktopRefreshJobManager(read_service=self._svc())
        return self._refresh_manager

    # ------------------------------------------------------------------
    # Utilitários
    # ------------------------------------------------------------------

    def ping(self, params=None) -> dict:
        return {"pong": True, "ts": time.time()}

    # ------------------------------------------------------------------
    # Diretório de empresas
    # ------------------------------------------------------------------

    def get_companies(self, params=None) -> dict:
        p = params or {}
        t0 = time.perf_counter()
        try:
            result = self._svc().list_companies(
                search=str(p.get("search", "")),
                sector_slug=p.get("sector_slug") or p.get("sector") or None,
                page=int(p.get("page", 1)),
                page_size=int(p.get("page_size", p.get("pageSize", 20))),
            )
            payload = dataclasses.asdict(result)
            payload["_bridge_ms"] = round((time.perf_counter() - t0) * 1000, 3)
            return payload
        except Exception as exc:
            return {"error": str(exc), "items": [], "pagination": {}}

    def get_company_filters(self, params=None) -> dict:
        try:
            result = self._svc().get_company_filters()
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc), "sectors": []}

    def get_company_suggestions(self, params=None) -> dict:
        p = params or {}
        try:
            items = self._svc().suggest_companies(
                query=str(p.get("q", "")),
                limit=int(p.get("limit", 6)),
                ready_only=bool(p.get("ready_only", False)),
            )
            return {"items": [dataclasses.asdict(i) for i in items]}
        except Exception as exc:
            return {"error": str(exc), "items": []}

    def get_populares(self, params=None) -> dict:
        try:
            result = self._svc().get_populares_companies()
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc), "items": [], "pagination": {}}

    def get_em_destaque(self, params=None) -> dict:
        p = params or {}
        try:
            result = self._svc().get_em_destaque_companies(
                limit=int(p.get("limit", 10))
            )
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc), "items": [], "pagination": {}}

    def track_company_view(self, params=None) -> dict:
        p = params or {}
        try:
            cd_cvm = int(p.get("cd_cvm", 0))
            if cd_cvm:
                self._svc().record_company_view(cd_cvm)
            return {"ok": True}
        except Exception:
            return {"ok": False}

    # ------------------------------------------------------------------
    # Detalhe de empresa
    # ------------------------------------------------------------------

    def get_company_info(self, params=None) -> dict:
        p = params or {}
        try:
            cd_cvm = int(p.get("cd_cvm", 0))
            result = self._svc().get_company_info(cd_cvm)
            if result is None:
                return {"not_found": True}
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc)}

    def get_company_years(self, params=None) -> dict:
        p = params or {}
        try:
            cd_cvm = int(p.get("cd_cvm", 0))
            years = self._svc().get_available_years(cd_cvm)
            return {"years": years}
        except Exception as exc:
            return {"error": str(exc), "years": []}

    def get_company_kpis(self, params=None) -> dict:
        p = params or {}
        try:
            cd_cvm = int(p.get("cd_cvm", 0))
            years_raw = p.get("years", [])
            if isinstance(years_raw, str):
                years = [int(y) for y in years_raw.split(",") if y.strip()]
            else:
                years = [int(y) for y in years_raw]
            result = self._svc().get_kpi_bundle(cd_cvm, years)
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc)}

    def get_company_statement(self, params=None) -> dict:
        p = params or {}
        try:
            cd_cvm = int(p.get("cd_cvm", 0))
            years_raw = p.get("years", [])
            if isinstance(years_raw, str):
                years = [int(y) for y in years_raw.split(",") if y.strip()]
            else:
                years = [int(y) for y in years_raw]
            stmt = str(p.get("stmt", "bpa"))
            result = self._svc().get_statement_matrix(cd_cvm, years, stmt)
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc)}

    # ------------------------------------------------------------------
    # Setores
    # ------------------------------------------------------------------

    def get_sectors(self, params=None) -> dict:
        try:
            result = self._svc().list_sectors()
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc), "items": []}

    def get_sector_detail(self, params=None) -> dict:
        p = params or {}
        try:
            slug = str(p.get("sector_slug", ""))
            year = p.get("year")
            year_int = int(year) if year is not None else None
            result = self._svc().get_sector_detail(slug, year_int)
            if result is None:
                return {"not_found": True}
            return dataclasses.asdict(result)
        except Exception as exc:
            return {"error": str(exc)}

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------

    def get_refresh_status(self, params=None) -> dict:
        try:
            return self._refresh().get_refresh_status(params or {})
        except Exception as exc:
            return {
                "state": "error",
                "processed": 0,
                "failures": 1,
                "current_cvm": None,
                "log_lines": [str(exc)],
                "error": str(exc),
            }

    def request_refresh(self, params=None) -> dict:
        try:
            return self._refresh().request_refresh(params or {})
        except Exception as exc:
            return {
                "status": "error",
                "job_id": None,
                "message": str(exc),
                "status_reason_code": "desktop_refresh_error",
                "status_reason_message": str(exc),
                "is_retry_allowed": True,
            }

    def cancel_refresh(self, params=None) -> dict:
        try:
            return self._refresh().cancel_job(params or {})
        except Exception as exc:
            return {"ok": False, "message": str(exc)}

    # ------------------------------------------------------------------
    # Health / diagnostico
    # ------------------------------------------------------------------

    def get_health(self, params=None) -> dict:
        try:
            from src.read_service import CVMReadService  # noqa: PLC0415
            svc = CVMReadService()
            # Faz uma consulta leve para checar DB
            svc.list_companies(page=1, page_size=1)
            return {
                "status": "ok",
                "version": "desktop",
                "database_dialect": "sqlite",
                "required_tables": [],
                "warnings": [],
                "errors": [],
            }
        except Exception as exc:
            return {
                "status": "degraded",
                "version": "desktop",
                "database_dialect": "sqlite",
                "required_tables": [],
                "warnings": [],
                "errors": [{"severity": "error", "code": "db_error",
                            "message": str(exc), "path": None}],
            }


def _serialize(obj: Any) -> Any:
    """Converte dataclasses e tuples para tipos serializáveis por pywebview."""
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return dataclasses.asdict(obj)
    if isinstance(obj, tuple):
        return list(obj)
    return obj
