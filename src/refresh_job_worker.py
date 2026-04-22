from __future__ import annotations

import logging
import os
import socket
import threading
import time
from dataclasses import dataclass, field

from sqlalchemy import text

from src.contracts import RefreshProgressUpdate, RefreshPolicy, RefreshRequest
from src.db import build_engine
from src.observability import log_event
from src.refresh_jobs import (
    JOB_STATE_ERROR,
    JOB_STATE_NO_DATA,
    JOB_STATE_SUCCESS,
    RefreshJobRecord,
    RefreshJobRepository,
)
from src.refresh_service import HeadlessRefreshService
from src.settings import AppSettings, get_settings


def _default_worker_id() -> str:
    return f"{socket.gethostname()}-{os.getpid()}"


@dataclass(frozen=True)
class RefreshWorkerConfig:
    worker_id: str = field(default_factory=_default_worker_id)
    poll_interval_seconds: float = 2.0
    heartbeat_interval_seconds: float = 5.0
    lease_seconds: int = 60
    max_attempts: int = 3


class _HeartbeatLoop:
    def __init__(
        self,
        *,
        repository: RefreshJobRepository,
        job_id: str,
        interval_seconds: float,
        logger: logging.Logger,
    ) -> None:
        self.repository = repository
        self.job_id = str(job_id)
        self.interval_seconds = max(1.0, float(interval_seconds))
        self.logger = logger
        self._stop_event = threading.Event()
        self._thread = threading.Thread(
            target=self._run,
            name=f"refresh-heartbeat-{self.job_id[:8]}",
            daemon=True,
        )

    def __enter__(self) -> "_HeartbeatLoop":
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self._stop_event.set()
        self._thread.join(timeout=self.interval_seconds + 1.0)

    def _run(self) -> None:
        while not self._stop_event.wait(self.interval_seconds):
            try:
                self.repository.heartbeat(job_id=self.job_id)
            except Exception:
                self.logger.exception(
                    "refresh_job_heartbeat_failed job_id=%s",
                    self.job_id,
                )


class RefreshJobWorker:
    def __init__(
        self,
        *,
        settings: AppSettings | None = None,
        repository: RefreshJobRepository | None = None,
        refresh_service: HeadlessRefreshService | None = None,
        logger: logging.Logger | None = None,
        config: RefreshWorkerConfig | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.logger = logger or logging.getLogger(__name__)
        self.repository = repository or RefreshJobRepository(build_engine(self.settings))
        self.refresh_service = refresh_service or HeadlessRefreshService(
            settings=self.settings,
            logger=self.logger,
        )
        self.config = config or RefreshWorkerConfig()

    @property
    def engine(self):
        return self.repository.engine

    def run_forever(self, *, stop_event: threading.Event | None = None) -> None:
        self.repository.ensure_schema()
        log_event(
            self.logger,
            "refresh-worker-started",
            worker_id=self.config.worker_id,
            poll_interval_seconds=self.config.poll_interval_seconds,
            heartbeat_interval_seconds=self.config.heartbeat_interval_seconds,
            lease_seconds=self.config.lease_seconds,
            max_attempts=self.config.max_attempts,
        )
        while stop_event is None or not stop_event.is_set():
            claimed = self.run_once()
            if claimed:
                continue
            wait_seconds = max(0.2, float(self.config.poll_interval_seconds))
            if stop_event is not None:
                stop_event.wait(wait_seconds)
            else:
                time.sleep(wait_seconds)

    def run_once(self) -> bool:
        recovered = self.repository.recover_stale_jobs(
            lease_seconds=self.config.lease_seconds,
            max_attempts=self.config.max_attempts,
        )
        if recovered:
            log_event(
                self.logger,
                "refresh-worker-recovered-stale-jobs",
                worker_id=self.config.worker_id,
                recovered=recovered,
            )

        job = self.repository.claim_next_job(worker_id=self.config.worker_id)
        if job is None:
            return False

        self._run_job(job)
        return True

    def _run_job(self, job: RefreshJobRecord) -> None:
        log_event(
            self.logger,
            "refresh-worker-claimed-job",
            worker_id=self.config.worker_id,
            job_id=job.id,
            cd_cvm=job.cd_cvm,
            start_year=job.start_year,
            end_year=job.end_year,
            attempt_count=job.attempt_count,
        )
        try:
            with _HeartbeatLoop(
                repository=self.repository,
                job_id=job.id,
                interval_seconds=self.config.heartbeat_interval_seconds,
                logger=self.logger,
            ):
                result = self.refresh_service.execute(
                    self._build_request(job),
                    stage_callback=lambda update: self._handle_stage_progress(
                        job.id,
                        update,
                    ),
                    persist_refresh_status=False,
                )
        except Exception as exc:
            error_message = f"{exc.__class__.__name__}: {exc}"
            self.logger.exception(
                "refresh-worker-job-failed job_id=%s cd_cvm=%s",
                job.id,
                job.cd_cvm,
            )
            self.repository.complete_job(
                job_id=job.id,
                final_state=JOB_STATE_ERROR,
                message=error_message,
                error_message=error_message,
            )
            return

        if not result.companies:
            rows_inserted = self._count_rows_in_range(
                cd_cvm=job.cd_cvm,
                start_year=job.start_year,
                end_year=job.end_year,
            )
            self.repository.complete_job(
                job_id=job.id,
                final_state=JOB_STATE_SUCCESS,
                message=(
                    "Empresa ja atualizada para "
                    f"{job.start_year}-{job.end_year}."
                ),
                last_rows_inserted=rows_inserted,
            )
            return

        company_result = next(
            (
                item
                for item in result.companies
                if int(item.cvm_code) == int(job.cd_cvm)
            ),
            result.companies[0],
        )
        if company_result.status == JOB_STATE_SUCCESS:
            rows_inserted = int(company_result.rows_inserted or 0)
            if rows_inserted <= 0:
                rows_inserted = self._count_rows_in_range(
                    cd_cvm=job.cd_cvm,
                    start_year=job.start_year,
                    end_year=job.end_year,
                )
            self.repository.complete_job(
                job_id=job.id,
                final_state=JOB_STATE_SUCCESS,
                message=(
                    "Refresh concluido com sucesso para "
                    f"{job.start_year}-{job.end_year}."
                ),
                last_rows_inserted=rows_inserted,
            )
            return

        if company_result.status == JOB_STATE_NO_DATA:
            self.repository.complete_job(
                job_id=job.id,
                final_state=JOB_STATE_NO_DATA,
                message=(
                    "Nenhuma demonstracao encontrada para "
                    f"{job.start_year}-{job.end_year}."
                ),
            )
            return

        error_message = str(
            company_result.error
            or "Falha operacional ao processar o refresh."
        )
        self.repository.complete_job(
            job_id=job.id,
            final_state=JOB_STATE_ERROR,
            message=error_message,
            error_message=error_message,
        )

    def _build_request(self, job: RefreshJobRecord) -> RefreshRequest:
        return RefreshRequest(
            companies=(str(job.cd_cvm),),
            start_year=int(job.start_year),
            end_year=int(job.end_year),
            policy=RefreshPolicy(
                skip_complete_company_years=True,
                enable_fast_lane=False,
                force_refresh=False,
            ),
        )

    def _handle_stage_progress(
        self,
        job_id: str,
        update: RefreshProgressUpdate,
    ) -> None:
        self.repository.update_progress(
            job_id=job_id,
            stage=update.stage,
            current=update.current,
            total=update.total,
            message=update.message,
        )

    def _count_rows_in_range(
        self,
        *,
        cd_cvm: int,
        start_year: int,
        end_year: int,
    ) -> int:
        with self.engine.connect() as conn:
            total = conn.execute(
                text(
                    """
                    SELECT COUNT(*) AS total
                    FROM financial_reports
                    WHERE "CD_CVM" = :cd_cvm
                      AND "REPORT_YEAR" BETWEEN :start_year AND :end_year
                    """
                ),
                {
                    "cd_cvm": int(cd_cvm),
                    "start_year": int(start_year),
                    "end_year": int(end_year),
                },
            ).scalar()
        return int(total or 0)
