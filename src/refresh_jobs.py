from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

JOB_STATE_QUEUED = "queued"
JOB_STATE_RUNNING = "running"
JOB_STATE_SUCCESS = "success"
JOB_STATE_NO_DATA = "no_data"
JOB_STATE_ERROR = "error"
ACTIVE_JOB_STATES = (JOB_STATE_QUEUED, JOB_STATE_RUNNING)

JOB_STAGE_QUEUED = "queued"
JOB_STAGE_PLANNING = "planning"
JOB_STAGE_DOWNLOAD_EXTRACT = "download_extract"
JOB_STAGE_PROCESS_DATA = "process_data"
JOB_STAGE_PERSIST_REPORTS = "persist_reports"
JOB_STAGE_FINALIZING = "finalizing"

REFRESH_STAGE_WEIGHTS = {
    JOB_STAGE_PLANNING: 5.0,
    JOB_STAGE_DOWNLOAD_EXTRACT: 45.0,
    JOB_STAGE_PROCESS_DATA: 20.0,
    JOB_STAGE_PERSIST_REPORTS: 25.0,
    JOB_STAGE_FINALIZING: 5.0,
}
REFRESH_STAGE_ORDER = (
    JOB_STAGE_PLANNING,
    JOB_STAGE_DOWNLOAD_EXTRACT,
    JOB_STAGE_PROCESS_DATA,
    JOB_STAGE_PERSIST_REPORTS,
    JOB_STAGE_FINALIZING,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


@dataclass(frozen=True)
class RefreshJobRecord:
    id: str
    cd_cvm: int
    company_name: str | None
    source_scope: str
    start_year: int
    end_year: int
    state: str
    stage: str | None
    requested_at: str
    started_at: str | None
    heartbeat_at: str | None
    finished_at: str | None
    attempt_count: int
    worker_id: str | None
    error_message: str | None
    progress_current: int | None
    progress_total: int | None
    progress_message: str | None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "RefreshJobRecord":
        return cls(
            id=str(row["id"]),
            cd_cvm=int(row["cd_cvm"]),
            company_name=(
                str(row["company_name"])
                if row.get("company_name") is not None
                else None
            ),
            source_scope=str(row.get("source_scope") or "on_demand"),
            start_year=int(row["start_year"]),
            end_year=int(row["end_year"]),
            state=str(row["state"]),
            stage=(
                str(row["stage"])
                if row.get("stage") is not None
                else None
            ),
            requested_at=str(row["requested_at"]),
            started_at=row.get("started_at"),
            heartbeat_at=row.get("heartbeat_at"),
            finished_at=row.get("finished_at"),
            attempt_count=int(row.get("attempt_count") or 0),
            worker_id=(
                str(row["worker_id"])
                if row.get("worker_id") is not None
                else None
            ),
            error_message=(
                str(row["error_message"])
                if row.get("error_message") is not None
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
            progress_message=(
                str(row["progress_message"])
                if row.get("progress_message") is not None
                else None
            ),
        )


def build_postgres_claim_next_job_sql() -> str:
    return """
        WITH next_job AS (
            SELECT id
            FROM refresh_jobs
            WHERE state = 'queued'
            ORDER BY requested_at ASC, id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        )
        UPDATE refresh_jobs
        SET state = 'running',
            stage = :stage,
            started_at = COALESCE(started_at, :now),
            heartbeat_at = :now,
            worker_id = :worker_id,
            attempt_count = attempt_count + 1,
            progress_current = :progress_current,
            progress_total = :progress_total,
            progress_message = :progress_message,
            error_message = NULL
        WHERE id IN (SELECT id FROM next_job)
        RETURNING *
    """


def ensure_refresh_runtime_tables(engine: Engine) -> None:
    with engine.begin() as conn:
        ensure_refresh_runtime_tables_for_connection(conn)


def ensure_refresh_runtime_tables_for_connection(conn) -> None:
    _ensure_refresh_status_schema(conn)
    _ensure_refresh_jobs_schema(conn)


def _get_table_columns(conn, table_name: str) -> set[str]:
    inspector = inspect(conn, raiseerr=False)
    if inspector is None:
        bind = getattr(conn, "engine", None) or getattr(conn, "bind", None)
        inspector = inspect(bind, raiseerr=False) if bind is not None else None
    if inspector is None or not inspector.has_table(table_name):
        return set()
    return {
        str(column.get("name") or "").lower()
        for column in inspector.get_columns(table_name)
    }


def _ensure_refresh_status_schema(conn) -> None:
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
                updated_at TEXT,
                job_id TEXT,
                stage TEXT,
                queue_position INTEGER,
                progress_current INTEGER,
                progress_total INTEGER,
                progress_message TEXT,
                started_at TEXT,
                heartbeat_at TEXT,
                finished_at TEXT
            )
            """
        )
    )

    columns = _get_table_columns(conn, "company_refresh_status")
    missing_columns = {
        "job_id": "TEXT",
        "stage": "TEXT",
        "queue_position": "INTEGER",
        "progress_current": "INTEGER",
        "progress_total": "INTEGER",
        "progress_message": "TEXT",
        "started_at": "TEXT",
        "heartbeat_at": "TEXT",
        "finished_at": "TEXT",
    }
    for name, ddl in missing_columns.items():
        if name not in columns:
            conn.execute(text(f"ALTER TABLE company_refresh_status ADD COLUMN {name} {ddl}"))

    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS idx_crs_status
            ON company_refresh_status(last_status)
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS idx_crs_job_id
            ON company_refresh_status(job_id)
            """
        )
    )


def _ensure_refresh_jobs_schema(conn) -> None:
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS refresh_jobs (
                id TEXT PRIMARY KEY,
                cd_cvm INTEGER NOT NULL,
                company_name TEXT,
                source_scope TEXT NOT NULL DEFAULT 'on_demand',
                start_year INTEGER NOT NULL,
                end_year INTEGER NOT NULL,
                state TEXT NOT NULL,
                stage TEXT,
                requested_at TEXT NOT NULL,
                started_at TEXT,
                heartbeat_at TEXT,
                finished_at TEXT,
                attempt_count INTEGER NOT NULL DEFAULT 0,
                worker_id TEXT,
                error_message TEXT,
                progress_current INTEGER,
                progress_total INTEGER,
                progress_message TEXT
            )
            """
        )
    )

    columns = _get_table_columns(conn, "refresh_jobs")
    missing_columns = {
        "company_name": "TEXT",
        "source_scope": "TEXT NOT NULL DEFAULT 'on_demand'",
        "stage": "TEXT",
        "started_at": "TEXT",
        "heartbeat_at": "TEXT",
        "finished_at": "TEXT",
        "attempt_count": "INTEGER NOT NULL DEFAULT 0",
        "worker_id": "TEXT",
        "error_message": "TEXT",
        "progress_current": "INTEGER",
        "progress_total": "INTEGER",
        "progress_message": "TEXT",
    }
    for name, ddl in missing_columns.items():
        if name not in columns:
            conn.execute(text(f"ALTER TABLE refresh_jobs ADD COLUMN {name} {ddl}"))

    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_jobs_state_requested_at
            ON refresh_jobs(state, requested_at)
            """
        )
    )
    conn.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_jobs_active_cd_cvm
            ON refresh_jobs(cd_cvm)
            WHERE state IN ('queued', 'running')
            """
        )
    )


class RefreshJobRepository:
    def __init__(self, engine: Engine):
        self.engine = engine

    def ensure_schema(self) -> None:
        ensure_refresh_runtime_tables(self.engine)

    def get_active_job_for_company(self, cd_cvm: int) -> RefreshJobRecord | None:
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            row = conn.execute(
                text(
                    """
                    SELECT *
                    FROM refresh_jobs
                    WHERE cd_cvm = :cd_cvm
                      AND state IN ('queued', 'running')
                    ORDER BY
                        CASE WHEN state = 'running' THEN 0 ELSE 1 END,
                        requested_at ASC,
                        id ASC
                    LIMIT 1
                    """
                ),
                {"cd_cvm": int(cd_cvm)},
            ).mappings().fetchone()
        return RefreshJobRecord.from_row(dict(row)) if row else None

    def enqueue_job(
        self,
        *,
        cd_cvm: int,
        company_name: str,
        source_scope: str,
        start_year: int,
        end_year: int,
    ) -> RefreshJobRecord | None:
        now_iso = utc_now_iso()
        job_id = uuid4().hex
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            active_row = self._get_active_job_row(conn, cd_cvm=cd_cvm)
            if active_row is not None:
                return None

            try:
                conn.execute(
                    text(
                        """
                        INSERT INTO refresh_jobs (
                            id,
                            cd_cvm,
                            company_name,
                            source_scope,
                            start_year,
                            end_year,
                            state,
                            stage,
                            requested_at,
                            progress_current,
                            progress_total,
                            progress_message
                        ) VALUES (
                            :id,
                            :cd_cvm,
                            :company_name,
                            :source_scope,
                            :start_year,
                            :end_year,
                            :state,
                            :stage,
                            :requested_at,
                            :progress_current,
                            :progress_total,
                            :progress_message
                        )
                        """
                    ),
                    {
                        "id": job_id,
                        "cd_cvm": int(cd_cvm),
                        "company_name": str(company_name),
                        "source_scope": str(source_scope),
                        "start_year": int(start_year),
                        "end_year": int(end_year),
                        "state": JOB_STATE_QUEUED,
                        "stage": JOB_STAGE_QUEUED,
                        "requested_at": now_iso,
                        "progress_current": 0,
                        "progress_total": 1,
                        "progress_message": "Solicitacao enfileirada para processamento interno.",
                    },
                )
            except IntegrityError:
                return None

            job_row = self._get_job_row(conn, job_id=job_id)
            if job_row is None:
                return None
            job = RefreshJobRecord.from_row(dict(job_row))
            self._upsert_projection_from_job(
                conn,
                job,
                last_status=JOB_STATE_QUEUED,
                last_error=None,
                last_success_at=None,
                last_rows_inserted=None,
            )
            self._sync_queue_positions(conn)
            return job

    def mark_already_current(
        self,
        *,
        cd_cvm: int,
        company_name: str,
        source_scope: str,
        start_year: int,
        end_year: int,
        message: str,
    ) -> dict[str, Any]:
        now_iso = utc_now_iso()
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            existing_row = self._get_projection_row(conn, cd_cvm=cd_cvm)
            last_success_at = (
                existing_row.get("last_success_at")
                if existing_row is not None and existing_row.get("last_success_at")
                else now_iso
            )
            last_rows_inserted = (
                int(existing_row["last_rows_inserted"])
                if existing_row is not None
                and existing_row.get("last_rows_inserted") is not None
                else None
            )
            self._upsert_projection_row(
                conn,
                {
                    "cd_cvm": int(cd_cvm),
                    "company_name": str(company_name),
                    "source_scope": str(source_scope),
                    "last_attempt_at": now_iso,
                    "last_success_at": last_success_at,
                    "last_status": JOB_STATE_SUCCESS,
                    "last_error": None,
                    "last_start_year": int(start_year),
                    "last_end_year": int(end_year),
                    "last_rows_inserted": last_rows_inserted,
                    "job_id": None,
                    "stage": None,
                    "queue_position": None,
                    "progress_current": 1,
                    "progress_total": 1,
                    "progress_message": str(message),
                    "started_at": None,
                    "heartbeat_at": None,
                    "finished_at": now_iso,
                    "updated_at": now_iso,
                },
            )
            self._sync_queue_positions(conn)
        return {"accepted_at": now_iso, "message": str(message)}

    def claim_next_job(
        self,
        *,
        worker_id: str,
    ) -> RefreshJobRecord | None:
        now_iso = utc_now_iso()
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            if self.engine.dialect.name == "postgresql":
                job_row = conn.execute(
                    text(build_postgres_claim_next_job_sql()),
                    {
                        "now": now_iso,
                        "worker_id": str(worker_id),
                        "stage": JOB_STAGE_PLANNING,
                        "progress_current": 0,
                        "progress_total": 1,
                        "progress_message": "Planejando o refresh interno.",
                    },
                ).mappings().fetchone()
            else:
                queued_row = conn.execute(
                    text(
                        """
                        SELECT *
                        FROM refresh_jobs
                        WHERE state = 'queued'
                        ORDER BY requested_at ASC, id ASC
                        LIMIT 1
                        """
                    )
                ).mappings().fetchone()
                if queued_row is None:
                    job_row = None
                else:
                    claimed = conn.execute(
                        text(
                            """
                            UPDATE refresh_jobs
                            SET state = 'running',
                                stage = :stage,
                                started_at = COALESCE(started_at, :now),
                                heartbeat_at = :now,
                                worker_id = :worker_id,
                                attempt_count = attempt_count + 1,
                                progress_current = :progress_current,
                                progress_total = :progress_total,
                                progress_message = :progress_message,
                                error_message = NULL
                            WHERE id = :id
                              AND state = 'queued'
                            """
                        ),
                        {
                            "id": str(queued_row["id"]),
                            "now": now_iso,
                            "worker_id": str(worker_id),
                            "stage": JOB_STAGE_PLANNING,
                            "progress_current": 0,
                            "progress_total": 1,
                            "progress_message": "Planejando o refresh interno.",
                        },
                    )
                    if int(claimed.rowcount or 0) <= 0:
                        job_row = None
                    else:
                        job_row = self._get_job_row(conn, job_id=str(queued_row["id"]))

            if job_row is None:
                return None

            job = RefreshJobRecord.from_row(dict(job_row))
            self._upsert_projection_from_job(
                conn,
                job,
                last_status=JOB_STATE_RUNNING,
                last_error=None,
                last_success_at=None,
                last_rows_inserted=None,
            )
            self._sync_queue_positions(conn)
            return job

    def heartbeat(self, *, job_id: str) -> None:
        now_iso = utc_now_iso()
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            conn.execute(
                text(
                    """
                    UPDATE refresh_jobs
                    SET heartbeat_at = :heartbeat_at
                    WHERE id = :id
                      AND state = 'running'
                    """
                ),
                {
                    "id": str(job_id),
                    "heartbeat_at": now_iso,
                },
            )
            job_row = self._get_job_row(conn, job_id=job_id)
            if job_row is None:
                return
            job = RefreshJobRecord.from_row(dict(job_row))
            self._upsert_projection_from_job(
                conn,
                job,
                last_status=JOB_STATE_RUNNING,
                last_error=None,
                last_success_at=None,
                last_rows_inserted=None,
            )

    def update_progress(
        self,
        *,
        job_id: str,
        stage: str,
        current: int,
        total: int,
        message: str,
    ) -> RefreshJobRecord | None:
        now_iso = utc_now_iso()
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            conn.execute(
                text(
                    """
                    UPDATE refresh_jobs
                    SET state = 'running',
                        stage = :stage,
                        progress_current = :progress_current,
                        progress_total = :progress_total,
                        progress_message = :progress_message,
                        heartbeat_at = :heartbeat_at,
                        started_at = COALESCE(started_at, :started_at)
                    WHERE id = :id
                    """
                ),
                {
                    "id": str(job_id),
                    "stage": str(stage),
                    "progress_current": int(current),
                    "progress_total": max(1, int(total)),
                    "progress_message": str(message),
                    "heartbeat_at": now_iso,
                    "started_at": now_iso,
                },
            )
            job_row = self._get_job_row(conn, job_id=job_id)
            if job_row is None:
                return None
            job = RefreshJobRecord.from_row(dict(job_row))
            self._upsert_projection_from_job(
                conn,
                job,
                last_status=JOB_STATE_RUNNING,
                last_error=None,
                last_success_at=None,
                last_rows_inserted=None,
            )
            return job

    def complete_job(
        self,
        *,
        job_id: str,
        final_state: str,
        message: str,
        error_message: str | None = None,
        last_rows_inserted: int | None = None,
    ) -> RefreshJobRecord | None:
        now_iso = utc_now_iso()
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            existing_projection = self._get_projection_row(
                conn,
                cd_cvm=self._get_job_cd_cvm(conn, job_id=job_id),
            )
            conn.execute(
                text(
                    """
                    UPDATE refresh_jobs
                    SET state = :state,
                        stage = NULL,
                        heartbeat_at = :heartbeat_at,
                        finished_at = :finished_at,
                        error_message = :error_message,
                        progress_message = :progress_message,
                        progress_current = COALESCE(progress_total, progress_current, 1),
                        progress_total = COALESCE(progress_total, 1)
                    WHERE id = :id
                    """
                ),
                {
                    "id": str(job_id),
                    "state": str(final_state),
                    "heartbeat_at": now_iso,
                    "finished_at": now_iso,
                    "error_message": (
                        str(error_message)
                        if error_message is not None
                        else None
                    ),
                    "progress_message": str(message),
                },
            )
            job_row = self._get_job_row(conn, job_id=job_id)
            if job_row is None:
                return None
            job = RefreshJobRecord.from_row(dict(job_row))
            self._upsert_projection_from_job(
                conn,
                job,
                last_status=str(final_state),
                last_error=(
                    str(error_message)
                    if final_state == JOB_STATE_ERROR and error_message
                    else None
                ),
                last_success_at=now_iso if final_state == JOB_STATE_SUCCESS else None,
                last_rows_inserted=(
                    int(last_rows_inserted)
                    if final_state == JOB_STATE_SUCCESS and last_rows_inserted is not None
                    else (
                        int(existing_projection["last_rows_inserted"])
                        if existing_projection is not None
                        and existing_projection.get("last_rows_inserted") is not None
                        else None
                    )
                ),
            )
            self._sync_queue_positions(conn)
            return job

    def recover_stale_jobs(
        self,
        *,
        lease_seconds: int,
        max_attempts: int,
    ) -> int:
        cutoff = utc_now() - timedelta(seconds=max(1, int(lease_seconds)))
        cutoff_iso = cutoff.isoformat()
        recovered = 0
        with self.engine.begin() as conn:
            ensure_refresh_runtime_tables_for_connection(conn)
            rows = conn.execute(
                text(
                    """
                    SELECT *
                    FROM refresh_jobs
                    WHERE state = 'running'
                      AND COALESCE(heartbeat_at, started_at, requested_at) < :cutoff
                    ORDER BY requested_at ASC, id ASC
                    """
                ),
                {"cutoff": cutoff_iso},
            ).mappings().all()

            for row in rows:
                job = RefreshJobRecord.from_row(dict(row))
                recovered += 1
                if job.attempt_count >= int(max_attempts):
                    terminal_message = (
                        "O processamento expirou repetidamente e foi encerrado."
                    )
                    conn.execute(
                        text(
                            """
                            UPDATE refresh_jobs
                            SET state = 'error',
                                stage = NULL,
                                finished_at = :finished_at,
                                heartbeat_at = :heartbeat_at,
                                error_message = :error_message,
                                progress_message = :progress_message
                            WHERE id = :id
                            """
                        ),
                        {
                            "id": job.id,
                            "finished_at": utc_now_iso(),
                            "heartbeat_at": utc_now_iso(),
                            "error_message": terminal_message,
                            "progress_message": terminal_message,
                        },
                    )
                    refreshed_row = self._get_job_row(conn, job_id=job.id)
                    if refreshed_row is not None:
                        self._upsert_projection_from_job(
                            conn,
                            RefreshJobRecord.from_row(dict(refreshed_row)),
                            last_status=JOB_STATE_ERROR,
                            last_error=terminal_message,
                            last_success_at=None,
                            last_rows_inserted=None,
                        )
                    continue

                queue_message = (
                    "A execucao anterior expirou e a solicitacao voltou para a fila."
                )
                conn.execute(
                    text(
                        """
                        UPDATE refresh_jobs
                        SET state = 'queued',
                            stage = :stage,
                            started_at = NULL,
                            heartbeat_at = NULL,
                            worker_id = NULL,
                            error_message = NULL,
                            progress_current = :progress_current,
                            progress_total = :progress_total,
                            progress_message = :progress_message
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": job.id,
                        "stage": JOB_STAGE_QUEUED,
                        "progress_current": 0,
                        "progress_total": 1,
                        "progress_message": queue_message,
                    },
                )
                refreshed_row = self._get_job_row(conn, job_id=job.id)
                if refreshed_row is not None:
                    self._upsert_projection_from_job(
                        conn,
                        RefreshJobRecord.from_row(dict(refreshed_row)),
                        last_status=JOB_STATE_QUEUED,
                        last_error=None,
                        last_success_at=None,
                        last_rows_inserted=None,
                    )

            self._sync_queue_positions(conn)
        return recovered

    def _get_job_cd_cvm(self, conn, *, job_id: str) -> int:
        row = conn.execute(
            text(
                """
                SELECT cd_cvm
                FROM refresh_jobs
                WHERE id = :id
                """
            ),
            {"id": str(job_id)},
        ).mappings().fetchone()
        return int(row["cd_cvm"]) if row is not None else 0

    @staticmethod
    def _get_job_row(conn, *, job_id: str) -> dict[str, Any] | None:
        row = conn.execute(
            text(
                """
                SELECT *
                FROM refresh_jobs
                WHERE id = :id
                """
            ),
            {"id": str(job_id)},
        ).mappings().fetchone()
        return dict(row) if row is not None else None

    @staticmethod
    def _get_active_job_row(conn, *, cd_cvm: int) -> dict[str, Any] | None:
        row = conn.execute(
            text(
                """
                SELECT *
                FROM refresh_jobs
                WHERE cd_cvm = :cd_cvm
                  AND state IN ('queued', 'running')
                ORDER BY
                    CASE WHEN state = 'running' THEN 0 ELSE 1 END,
                    requested_at ASC,
                    id ASC
                LIMIT 1
                """
            ),
            {"cd_cvm": int(cd_cvm)},
        ).mappings().fetchone()
        return dict(row) if row is not None else None

    @staticmethod
    def _get_projection_row(conn, *, cd_cvm: int) -> dict[str, Any] | None:
        if int(cd_cvm or 0) <= 0:
            return None
        row = conn.execute(
            text(
                """
                SELECT *
                FROM company_refresh_status
                WHERE cd_cvm = :cd_cvm
                """
            ),
            {"cd_cvm": int(cd_cvm)},
        ).mappings().fetchone()
        return dict(row) if row is not None else None

    def _upsert_projection_from_job(
        self,
        conn,
        job: RefreshJobRecord,
        *,
        last_status: str,
        last_error: str | None,
        last_success_at: str | None,
        last_rows_inserted: int | None,
    ) -> None:
        existing = self._get_projection_row(conn, cd_cvm=job.cd_cvm)
        existing_company_name = existing.get("company_name") if existing is not None else None
        existing_last_success_at = existing.get("last_success_at") if existing is not None else None
        existing_last_rows_inserted = (
            int(existing["last_rows_inserted"])
            if existing is not None and existing.get("last_rows_inserted") is not None
            else None
        )
        existing_queue_position = (
            int(existing["queue_position"])
            if existing is not None and existing.get("queue_position") is not None
            else None
        )
        self._upsert_projection_row(
            conn,
            {
                "cd_cvm": int(job.cd_cvm),
                "company_name": str(job.company_name or existing_company_name or job.cd_cvm),
                "source_scope": str(job.source_scope or "on_demand"),
                "last_attempt_at": str(job.requested_at),
                "last_success_at": (
                    last_success_at
                    if last_success_at is not None
                    else existing_last_success_at
                ),
                "last_status": str(last_status),
                "last_error": last_error,
                "last_start_year": int(job.start_year),
                "last_end_year": int(job.end_year),
                "last_rows_inserted": (
                    int(last_rows_inserted)
                    if last_rows_inserted is not None
                    else existing_last_rows_inserted
                ),
                "job_id": str(job.id),
                "stage": job.stage,
                "queue_position": existing_queue_position,
                "progress_current": job.progress_current,
                "progress_total": job.progress_total,
                "progress_message": job.progress_message,
                "started_at": job.started_at,
                "heartbeat_at": job.heartbeat_at,
                "finished_at": job.finished_at,
                "updated_at": utc_now_iso(),
            },
        )

    @staticmethod
    def _upsert_projection_row(conn, payload: dict[str, Any]) -> None:
        conn.execute(
            text(
                """
                INSERT INTO company_refresh_status (
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
                    updated_at,
                    job_id,
                    stage,
                    queue_position,
                    progress_current,
                    progress_total,
                    progress_message,
                    started_at,
                    heartbeat_at,
                    finished_at
                ) VALUES (
                    :cd_cvm,
                    :company_name,
                    :source_scope,
                    :last_attempt_at,
                    :last_success_at,
                    :last_status,
                    :last_error,
                    :last_start_year,
                    :last_end_year,
                    :last_rows_inserted,
                    :updated_at,
                    :job_id,
                    :stage,
                    :queue_position,
                    :progress_current,
                    :progress_total,
                    :progress_message,
                    :started_at,
                    :heartbeat_at,
                    :finished_at
                )
                ON CONFLICT(cd_cvm) DO UPDATE SET
                    company_name = excluded.company_name,
                    source_scope = excluded.source_scope,
                    last_attempt_at = excluded.last_attempt_at,
                    last_success_at = COALESCE(excluded.last_success_at, company_refresh_status.last_success_at),
                    last_status = excluded.last_status,
                    last_error = excluded.last_error,
                    last_start_year = excluded.last_start_year,
                    last_end_year = excluded.last_end_year,
                    last_rows_inserted = COALESCE(excluded.last_rows_inserted, company_refresh_status.last_rows_inserted),
                    updated_at = excluded.updated_at,
                    job_id = excluded.job_id,
                    stage = excluded.stage,
                    queue_position = excluded.queue_position,
                    progress_current = excluded.progress_current,
                    progress_total = excluded.progress_total,
                    progress_message = excluded.progress_message,
                    started_at = excluded.started_at,
                    heartbeat_at = excluded.heartbeat_at,
                    finished_at = excluded.finished_at
                """
            ),
            payload,
        )

    @staticmethod
    def _sync_queue_positions(conn) -> None:
        conn.execute(text("UPDATE company_refresh_status SET queue_position = NULL"))
        rows = conn.execute(
            text(
                """
                SELECT id, cd_cvm
                FROM refresh_jobs
                WHERE state = 'queued'
                ORDER BY requested_at ASC, id ASC
                """
            )
        ).mappings().all()
        for index, row in enumerate(rows):
            conn.execute(
                text(
                    """
                    UPDATE company_refresh_status
                    SET queue_position = :queue_position
                    WHERE cd_cvm = :cd_cvm
                    """
                ),
                {
                    "queue_position": int(index),
                    "cd_cvm": int(row["cd_cvm"]),
                },
            )
