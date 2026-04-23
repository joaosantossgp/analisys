from __future__ import annotations

from dataclasses import replace

import pytest
from sqlalchemy import text

from src.contracts import (
    CompanyRefreshResult,
    RefreshProgressUpdate,
    RefreshRequest,
    RefreshResult,
)
from src.database import init_db_tables
from src.db import build_engine
from src.refresh_job_worker import RefreshJobWorker, RefreshWorkerConfig
from src.refresh_jobs import (
    JOB_STATE_ERROR,
    JOB_STATE_NO_DATA,
    JOB_STATE_SUCCESS,
    RefreshJobRepository,
    build_postgres_claim_next_job_sql,
)
from src.settings import build_settings


def _make_repository(tmp_path):
    settings = build_settings(project_root=tmp_path)
    settings.paths.db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = build_engine(settings)
    repository = RefreshJobRepository(engine)
    repository.ensure_schema()
    return settings, repository


def _read_projection(repository: RefreshJobRepository, cd_cvm: int) -> dict:
    with repository.engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT *
                FROM company_refresh_status
                WHERE cd_cvm = :cd_cvm
                """
            ),
            {"cd_cvm": int(cd_cvm)},
        ).mappings().one()
    return dict(row)


def _read_job(repository: RefreshJobRepository, job_id: str) -> dict:
    with repository.engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT *
                FROM refresh_jobs
                WHERE id = :id
                """
            ),
            {"id": str(job_id)},
        ).mappings().one()
    return dict(row)


def _insert_financial_report_row(
    repository: RefreshJobRepository,
    *,
    cd_cvm: int = 4170,
    company_name: str = "VALE",
    year: int,
    period_label: str,
    line_id_base: str,
    value: float,
) -> None:
    init_db_tables(repository.engine)
    with repository.engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO companies (
                    cd_cvm, company_name, company_type, is_active, updated_at
                ) VALUES (
                    :cd_cvm, :company_name, 'comercial', 1, '2026-04-22T10:00:00+00:00'
                )
                ON CONFLICT(cd_cvm) DO UPDATE SET
                    company_name = excluded.company_name,
                    updated_at = excluded.updated_at
                """
            ),
            {"cd_cvm": int(cd_cvm), "company_name": str(company_name)},
        )
        conn.execute(
            text(
                """
                INSERT INTO financial_reports (
                    "COMPANY_NAME",
                    "CD_CVM",
                    "COMPANY_TYPE",
                    "STATEMENT_TYPE",
                    "REPORT_YEAR",
                    "PERIOD_LABEL",
                    "LINE_ID_BASE",
                    "CD_CONTA",
                    "DS_CONTA",
                    "STANDARD_NAME",
                    "QA_CONFLICT",
                    "VL_CONTA"
                ) VALUES (
                    :company_name,
                    :cd_cvm,
                    'comercial',
                    'DRE',
                    :year,
                    :period_label,
                    :line_id_base,
                    '3.01',
                    'Receita',
                    'Receita',
                    0,
                    :value
                )
                """
            ),
            {
                "company_name": str(company_name),
                "cd_cvm": int(cd_cvm),
                "year": int(year),
                "period_label": str(period_label),
                "line_id_base": str(line_id_base),
                "value": float(value),
            },
        )


def test_build_postgres_claim_next_job_sql_uses_skip_locked():
    sql = build_postgres_claim_next_job_sql()

    assert "FOR UPDATE SKIP LOCKED" in sql
    assert "UPDATE refresh_jobs" in sql


def test_refresh_job_repository_projects_zero_based_queue_positions(tmp_path):
    _, repository = _make_repository(tmp_path)

    first = repository.enqueue_job(
        cd_cvm=4170,
        company_name="VALE",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    )
    second = repository.enqueue_job(
        cd_cvm=9512,
        company_name="PETROBRAS",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    )

    assert first is not None
    assert second is not None
    assert repository.enqueue_job(
        cd_cvm=4170,
        company_name="VALE",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    ) is None

    first_projection = _read_projection(repository, 4170)
    second_projection = _read_projection(repository, 9512)

    assert first_projection["queue_position"] == 0
    assert second_projection["queue_position"] == 1


def test_refresh_job_repository_updates_progress_projection_fields(tmp_path):
    _, repository = _make_repository(tmp_path)
    queued = repository.enqueue_job(
        cd_cvm=4170,
        company_name="VALE",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    )
    assert queued is not None

    claimed = repository.claim_next_job(worker_id="worker-a")
    assert claimed is not None

    repository.update_progress(
        job_id=claimed.id,
        stage="download_extract",
        current=4,
        total=10,
        message="Download concluido para DFP/2018.",
    )

    projection = _read_projection(repository, 4170)
    job_row = _read_job(repository, claimed.id)

    assert projection["last_status"] == "running"
    assert projection["stage"] == "download_extract"
    assert projection["progress_current"] == 4
    assert projection["progress_total"] == 10
    assert projection["progress_message"] == "Download concluido para DFP/2018."
    assert projection["queue_position"] is None
    assert job_row["state"] == "running"
    assert job_row["worker_id"] == "worker-a"


def test_refresh_job_repository_recovers_stale_jobs_and_enforces_attempt_limit(tmp_path):
    _, repository = _make_repository(tmp_path)
    queued = repository.enqueue_job(
        cd_cvm=4170,
        company_name="VALE",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    )
    assert queued is not None

    for expected_attempt in (1, 2):
        claimed = repository.claim_next_job(worker_id=f"worker-{expected_attempt}")
        assert claimed is not None
        with repository.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    UPDATE refresh_jobs
                    SET started_at = '2000-01-01T00:00:00+00:00',
                        heartbeat_at = '2000-01-01T00:00:00+00:00'
                    WHERE id = :id
                    """
                ),
                {"id": claimed.id},
            )

        recovered = repository.recover_stale_jobs(lease_seconds=60, max_attempts=3)
        assert recovered == 1

        projection = _read_projection(repository, 4170)
        job_row = _read_job(repository, claimed.id)
        assert projection["last_status"] == "queued"
        assert job_row["state"] == "queued"
        assert int(job_row["attempt_count"]) == expected_attempt

    claimed = repository.claim_next_job(worker_id="worker-3")
    assert claimed is not None
    with repository.engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE refresh_jobs
                SET started_at = '2000-01-01T00:00:00+00:00',
                    heartbeat_at = '2000-01-01T00:00:00+00:00'
                WHERE id = :id
                """
            ),
            {"id": claimed.id},
        )

    recovered = repository.recover_stale_jobs(lease_seconds=60, max_attempts=3)
    assert recovered == 1

    projection = _read_projection(repository, 4170)
    job_row = _read_job(repository, claimed.id)
    assert projection["last_status"] == "error"
    assert "expirou" in str(projection["last_error"]).lower()
    assert job_row["state"] == "error"
    assert int(job_row["attempt_count"]) == 3


class _StubRefreshService:
    def __init__(self, result: RefreshResult, on_execute=None):
        self.result = result
        self.on_execute = on_execute
        self.persist_flags: list[bool] = []

    def execute(
        self,
        request: RefreshRequest,
        *,
        stage_callback=None,
        persist_refresh_status: bool = True,
        **_: object,
    ) -> RefreshResult:
        self.persist_flags.append(bool(persist_refresh_status))
        if self.on_execute is not None:
            self.on_execute()
        if stage_callback is not None:
            stage_callback(
                RefreshProgressUpdate(
                    stage="process_data",
                    current=1,
                    total=1,
                    message="Processamento concluido.",
                )
            )
        return replace(self.result, request=request)


@pytest.mark.parametrize(
    ("status", "expected_last_status", "expected_last_error"),
    [
        ("success", JOB_STATE_SUCCESS, None),
        ("no_data", JOB_STATE_NO_DATA, None),
        ("error", JOB_STATE_ERROR, "Falha controlada"),
    ],
)
def test_refresh_job_worker_persists_terminal_states(
    tmp_path,
    status: str,
    expected_last_status: str,
    expected_last_error: str | None,
):
    settings, repository = _make_repository(tmp_path)
    queued = repository.enqueue_job(
        cd_cvm=4170,
        company_name="VALE",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    )
    assert queued is not None

    on_execute = None
    if status == "success":
        on_execute = lambda: _insert_financial_report_row(
            repository,
            year=2025,
            period_label="2025",
            line_id_base="visible-2025",
            value=123.0,
        )

    result = RefreshResult(
        request=RefreshRequest(companies=("4170",), start_year=2010, end_year=2025),
        companies=(
            CompanyRefreshResult(
                company_name="VALE",
                cvm_code=4170,
                requested_years=(2010, 2025),
                years_processed=(2025,) if status == "success" else (),
                rows_inserted=7 if status == "success" else 0,
                status=status,
                attempts=1,
                error="Falha controlada" if status == "error" else None,
                traceback=None,
            ),
        ),
        planning_stats={"planned_company_years": 1},
        synced_companies=0,
        cancelled=False,
    )
    refresh_service = _StubRefreshService(result, on_execute=on_execute)
    worker = RefreshJobWorker(
        settings=settings,
        repository=repository,
        refresh_service=refresh_service,
        config=RefreshWorkerConfig(
            worker_id="worker-test",
            poll_interval_seconds=0.1,
            heartbeat_interval_seconds=5.0,
            lease_seconds=60,
            max_attempts=3,
        ),
    )

    ran = worker.run_once()

    assert ran is True
    assert refresh_service.persist_flags == [False]

    projection = _read_projection(repository, 4170)
    job_row = _read_job(repository, queued.id)

    assert projection["last_status"] == expected_last_status
    assert job_row["state"] == expected_last_status
    if expected_last_status == JOB_STATE_SUCCESS:
        assert projection["last_rows_inserted"] == 7
        assert projection["last_error"] is None
    elif expected_last_status == JOB_STATE_NO_DATA:
        assert "nenhuma demonstracao" in str(projection["progress_message"]).lower()
        assert projection["last_error"] is None
    else:
        assert expected_last_error in str(projection["last_error"])


def test_refresh_job_worker_maps_technical_success_without_readable_change_to_no_data(tmp_path):
    settings, repository = _make_repository(tmp_path)
    queued = repository.enqueue_job(
        cd_cvm=4170,
        company_name="VALE",
        source_scope="on_demand",
        start_year=2010,
        end_year=2025,
    )
    assert queued is not None

    result = RefreshResult(
        request=RefreshRequest(companies=("4170",), start_year=2010, end_year=2025),
        companies=(
            CompanyRefreshResult(
                company_name="VALE",
                cvm_code=4170,
                requested_years=(2025,),
                years_processed=(2025,),
                rows_inserted=1,
                status="success",
                attempts=1,
                error=None,
                traceback=None,
            ),
        ),
        planning_stats={"planned_company_years": 1},
        synced_companies=0,
        cancelled=False,
    )
    refresh_service = _StubRefreshService(
        result,
        on_execute=lambda: _insert_financial_report_row(
            repository,
            year=2025,
            period_label="1Q25",
            line_id_base="quarter-only-2025",
            value=123.0,
        ),
    )
    worker = RefreshJobWorker(
        settings=settings,
        repository=repository,
        refresh_service=refresh_service,
        config=RefreshWorkerConfig(
            worker_id="worker-test",
            poll_interval_seconds=0.1,
            heartbeat_interval_seconds=5.0,
            lease_seconds=60,
            max_attempts=3,
        ),
    )

    ran = worker.run_once()

    assert ran is True
    projection = _read_projection(repository, 4170)
    job_row = _read_job(repository, queued.id)

    assert projection["last_status"] == JOB_STATE_NO_DATA
    assert job_row["state"] == JOB_STATE_NO_DATA
    assert "nenhuma nova leitura anual" in str(projection["progress_message"]).lower()
    assert projection["last_success_at"] is None
    assert projection["read_model_updated_at"] is None
