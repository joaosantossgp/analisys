from __future__ import annotations

import threading
from datetime import datetime
from typing import Any
from uuid import uuid4

from src.contracts import RefreshPolicy, RefreshProgressUpdate, RefreshRequest
from src.refresh_service import HeadlessRefreshService
from src.settings import AppSettings


class RefreshBatchRequestError(ValueError):
    """Raised when the batch refresh request is not executable."""


class ApiRefreshJobManager:
    """In-process background queue for API-triggered batch refreshes."""

    VALID_MODES = {"full", "missing", "outdated", "failed"}
    ACTIVE_STATES = {"queued", "running"}
    DEFAULT_START_YEAR = 2010
    MAX_LOG_LINES = 200

    def __init__(
        self,
        *,
        settings: AppSettings,
        read_service: Any,
        refresh_service: HeadlessRefreshService | None = None,
        autostart: bool = True,
    ) -> None:
        self.settings = settings
        self.read_service = read_service
        self.refresh_service = refresh_service or HeadlessRefreshService(settings=settings)
        self.autostart = bool(autostart)
        self._lock = threading.RLock()
        self._jobs: dict[str, dict[str, Any]] = {}
        self._threads: dict[str, threading.Thread] = {}

    def request_refresh(self, params: dict[str, Any] | None = None) -> dict[str, Any]:
        request_params = dict(params or {})
        mode = str(request_params.get("mode") or "missing").strip().lower()
        if mode not in self.VALID_MODES:
            raise RefreshBatchRequestError(f"Modo de refresh invalido: {mode}")

        try:
            selection = self._resolve_batch_selection(request_params, mode=mode)
        except ValueError as exc:
            raise RefreshBatchRequestError(str(exc)) from exc
        companies = list(selection.companies)
        start_year, end_year = selection.start_year, selection.end_year
        if not companies:
            now = self._now_iso()
            return {
                "status": "already_current",
                "job_id": None,
                "accepted_at": now,
                "queued": 0,
                "message": "Nenhuma empresa elegivel para refresh.",
                "status_reason_code": "empty_scope",
                "is_retry_allowed": False,
            }

        active_job = self._find_active_job()
        if active_job is not None:
            return {
                "status": "already_running",
                "job_id": active_job["job_id"],
                "accepted_at": active_job.get("accepted_at"),
                "queued": int(active_job.get("queued") or 0),
                "message": "Ja existe um refresh em andamento.",
                "status_reason_code": "already_running",
                "is_retry_allowed": False,
            }

        job_id = uuid4().hex
        now = self._now_iso()
        job = {
            "job_id": job_id,
            "state": "queued",
            "status": "queued",
            "mode": mode,
            "accepted_at": now,
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "finished_at": None,
            "queued": len(companies),
            "processed": 0,
            "failures": 0,
            "current_cvm": None,
            "stage": None,
            "progress_current": None,
            "progress_total": None,
            "log_lines": ["Refresh em lote enfileirado."],
            "params": request_params,
            "request": {
                "companies": [str(company) for company in companies],
                "start_year": int(start_year),
                "end_year": int(end_year),
            },
            "error": None,
            "result": None,
        }
        with self._lock:
            self._jobs[job_id] = job

        if self.autostart:
            self._start_job(job_id)

        return {
            "status": "running" if self.autostart else "queued",
            "job_id": job_id,
            "accepted_at": now,
            "queued": len(companies),
            "message": "Refresh em lote iniciado em background.",
            "status_reason_code": "refresh_started",
            "is_retry_allowed": False,
        }

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(str(job_id))
            return self._public_job(job) if job is not None else None

    def list_jobs(self, *, active_only: bool = True) -> list[dict[str, Any]]:
        with self._lock:
            jobs = [self._public_job(job) for job in self._jobs.values()]
        if active_only:
            jobs = [
                job for job in jobs if str(job.get("state") or "") in self.ACTIVE_STATES
            ]
        jobs.sort(key=lambda row: str(row.get("updated_at") or ""), reverse=True)
        return jobs

    def _start_job(self, job_id: str) -> None:
        thread = threading.Thread(
            target=self._run_job,
            args=(job_id,),
            name=f"api-refresh-{job_id[:8]}",
            daemon=True,
        )
        self._threads[job_id] = thread
        thread.start()

    def _run_job(self, job_id: str) -> None:
        self._update_job(
            job_id,
            state="running",
            status="running",
            started_at=self._now_iso(),
            log_line="Refresh em lote em execucao.",
        )
        try:
            with self._lock:
                job = dict(self._jobs[job_id])
            payload = dict(job["request"])
            mode = str(job.get("mode") or "missing")
            request = RefreshRequest(
                companies=tuple(str(company) for company in payload["companies"]),
                start_year=int(payload["start_year"]),
                end_year=int(payload["end_year"]),
                policy=RefreshPolicy(
                    skip_complete_company_years=mode != "full",
                    enable_fast_lane=mode == "missing",
                    force_refresh=mode == "full",
                ),
            )
            result = self.refresh_service.execute(
                request,
                progress_callback=lambda current, total, message: self._handle_progress(
                    job_id,
                    current=current,
                    total=total,
                    message=message,
                ),
                stage_callback=lambda update: self._handle_stage(job_id, update),
            )
        except Exception as exc:
            self._update_job(
                job_id,
                state="error",
                status="error",
                finished_at=self._now_iso(),
                error=f"{exc.__class__.__name__}: {exc}",
                log_line=f"Falha no refresh em lote: {exc}",
            )
            self._threads.pop(job_id, None)
            return

        state = "cancelled" if result.cancelled else "success"
        failures = int(result.error_count)
        if failures and not result.cancelled:
            state = "error"
        self._update_job(
            job_id,
            state=state,
            status=state,
            processed=len(result.companies),
            failures=failures,
            finished_at=self._now_iso(),
            result=result.to_dict(),
            log_line="Refresh em lote finalizado.",
        )
        self._threads.pop(job_id, None)

    def _resolve_batch_selection(self, params: dict[str, Any], *, mode: str):
        from src.read_service import resolve_refresh_batch_selection  # noqa: PLC0415

        return resolve_refresh_batch_selection(
            self.read_service,
            params,
            mode=mode,
            default_start_year=self.DEFAULT_START_YEAR,
        )

    def _resolve_companies(self, params: dict[str, Any], *, mode: str) -> list[str]:
        return list(self._resolve_batch_selection(params, mode=mode).companies)

    def _filter_by_status(self, companies: list[str], status_filter: str) -> list[str]:
        normalized = status_filter.strip().lower()
        if not normalized or normalized in {"all", "todos"}:
            return companies

        failed_states = {"failed", "error", "dispatch_failed"}
        statuses = {
            int(item.cd_cvm): str(
                item.tracking_state or item.last_status or item.latest_attempt_outcome or ""
            ).strip().lower()
            for item in self.read_service.list_refresh_status()
        }
        selected: list[str] = []
        for raw_code in companies:
            code = int(raw_code)
            state = statuses.get(code, "")
            if normalized == "failed":
                if state in failed_states:
                    selected.append(raw_code)
            elif state == normalized:
                selected.append(raw_code)
        return selected

    @staticmethod
    def _filter_cvm_range(companies: list[str], raw_range: Any) -> list[str]:
        if raw_range in (None, ""):
            return companies
        start: Any | None = None
        end: Any | None = None
        if isinstance(raw_range, dict):
            start = raw_range.get("start") or raw_range.get("from")
            end = raw_range.get("end") or raw_range.get("to")
        elif isinstance(raw_range, (list, tuple)) and len(raw_range) >= 2:
            start, end = raw_range[0], raw_range[1]
        elif isinstance(raw_range, str) and "-" in raw_range:
            left, right = raw_range.split("-", 1)
            start, end = left.strip(), right.strip()
        if start in (None, "") and end in (None, ""):
            return companies
        start_int = int(start) if start not in (None, "") else -1
        end_int = int(end) if end not in (None, "") else 10**9
        if start_int > end_int:
            raise RefreshBatchRequestError("cvm_range.start nao pode ser maior que cvm_range.end.")
        return [
            raw_code
            for raw_code in companies
            if start_int <= int(raw_code) <= end_int
        ]

    @classmethod
    def _resolve_year_range(cls, params: dict[str, Any]) -> tuple[int, int]:
        end_year = int(params.get("end_year") or datetime.now().year - 1)
        start_year = int(params.get("start_year") or cls.DEFAULT_START_YEAR)
        if start_year > end_year:
            raise RefreshBatchRequestError("start_year nao pode ser maior que end_year.")
        return start_year, end_year

    def _find_active_job(self) -> dict[str, Any] | None:
        with self._lock:
            for job in self._jobs.values():
                if str(job.get("state") or "") in self.ACTIVE_STATES:
                    return self._public_job(job)
        return None

    def _handle_stage(self, job_id: str, update: RefreshProgressUpdate) -> None:
        self._update_job(
            job_id,
            stage=update.stage,
            progress_current=int(update.current),
            progress_total=max(1, int(update.total)),
            log_line=update.message,
        )

    def _handle_progress(
        self,
        job_id: str,
        *,
        current: int,
        total: int,
        message: str,
    ) -> None:
        current_cvm = self._extract_current_cvm(message)
        self._update_job(
            job_id,
            processed=max(0, int(current) - 1),
            progress_current=int(current),
            progress_total=max(1, int(total)),
            current_cvm=current_cvm,
            log_line=message,
        )

    @staticmethod
    def _extract_current_cvm(message: str) -> int | None:
        for token in str(message or "").replace("=", " ").split():
            if token.isdigit():
                return int(token)
        return None

    def _update_job(self, job_id: str, **changes: Any) -> None:
        log_line = changes.pop("log_line", None)
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for key, value in changes.items():
                if value is not None or key in {"current_cvm", "error", "finished_at"}:
                    job[key] = value
            job["updated_at"] = self._now_iso()
            if log_line:
                self._append_log_locked(job, str(log_line))

    @classmethod
    def _append_log_locked(cls, job: dict[str, Any], message: str) -> None:
        log_lines = list(job.get("log_lines") or [])
        log_lines.append(message)
        job["log_lines"] = log_lines[-cls.MAX_LOG_LINES :]

    @staticmethod
    def _public_job(job: dict[str, Any]) -> dict[str, Any]:
        return {
            "job_id": job.get("job_id"),
            "state": job.get("state"),
            "status": job.get("status") or job.get("state"),
            "stage": job.get("stage"),
            "queued": int(job.get("queued") or 0),
            "processed": int(job.get("processed") or 0),
            "failures": int(job.get("failures") or 0),
            "current_cvm": job.get("current_cvm"),
            "progress_current": job.get("progress_current"),
            "progress_total": job.get("progress_total"),
            "log_lines": list(job.get("log_lines") or []),
            "accepted_at": job.get("accepted_at"),
            "started_at": job.get("started_at"),
            "finished_at": job.get("finished_at"),
            "updated_at": job.get("updated_at"),
            "error": job.get("error"),
            "result": job.get("result"),
        }

    @staticmethod
    def _now_iso() -> str:
        return datetime.now().replace(microsecond=0).isoformat()
