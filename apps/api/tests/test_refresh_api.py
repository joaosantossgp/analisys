from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from apps.api.app.services.refresh_jobs import ApiRefreshJobManager, RefreshBatchRequestError
from src.settings import AppSettings


def _running_job(job_id: str = "job-batch-1") -> dict[str, object]:
    return {
        "job_id": job_id,
        "state": "running",
        "status": "running",
        "stage": "download_extract",
        "queued": 2,
        "processed": 1,
        "failures": 0,
        "current_cvm": 9512,
        "progress_current": 1,
        "progress_total": 2,
        "log_lines": ["Refresh em lote em execucao.", "Processando CVM 9512."],
        "accepted_at": "2026-05-03T10:00:00",
        "started_at": "2026-05-03T10:00:01",
        "finished_at": None,
        "updated_at": "2026-05-03T10:00:02",
        "error": None,
        "result": None,
    }


class FakeRefreshJobManager:
    def __init__(self) -> None:
        self.requests: list[dict[str, object]] = []
        self.active_only_args: list[bool] = []
        self.jobs = {"job-batch-1": _running_job()}

    def request_refresh(self, params: dict[str, object]) -> dict[str, object]:
        self.requests.append(dict(params))
        return {
            "job_id": "job-batch-1",
            "status": "running",
            "accepted_at": "2026-05-03T10:00:00",
            "queued": 2,
            "message": "Refresh em lote iniciado em background.",
            "status_reason_code": "refresh_started",
            "is_retry_allowed": False,
        }

    def get_job(self, job_id: str) -> dict[str, object] | None:
        return self.jobs.get(job_id)

    def list_jobs(self, *, active_only: bool = True) -> list[dict[str, object]]:
        self.active_only_args.append(active_only)
        return list(self.jobs.values())


def test_refresh_batch_dispatch_returns_202(client: TestClient) -> None:
    manager = FakeRefreshJobManager()
    client.app.state.refresh_job_manager = manager

    response = client.post("/refresh/batch", json={"mode": "missing"})

    assert response.status_code == 202
    payload = response.json()
    assert payload["job_id"] == "job-batch-1"
    assert payload["status"] == "running"
    assert payload["queued"] == 2
    assert manager.requests == [{"mode": "missing"}]


def test_refresh_batch_accepts_bridge_filter_params(client: TestClient) -> None:
    manager = FakeRefreshJobManager()
    client.app.state.refresh_job_manager = manager

    response = client.post(
        "/refresh/batch",
        json={
            "mode": "failed",
            "sector_slug": "energia",
            "cvm_range": {"start": 4000, "end": 12000},
            "status_filter": "error",
            "start_year": 2023,
            "end_year": 2024,
        },
    )

    assert response.status_code == 202
    assert manager.requests == [
        {
            "mode": "failed",
            "sector_slug": "energia",
            "cvm_range": {"start": 4000, "end": 12000},
            "status_filter": "error",
            "start_year": 2023,
            "end_year": 2024,
        }
    ]


def test_refresh_job_polling_returns_progress(client: TestClient) -> None:
    manager = FakeRefreshJobManager()
    client.app.state.refresh_job_manager = manager

    response = client.get("/refresh/jobs/job-batch-1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["state"] == "running"
    assert payload["processed"] == 1
    assert payload["failures"] == 0
    assert payload["current_cvm"] == 9512
    assert payload["log_lines"][-1] == "Processando CVM 9512."


def test_refresh_jobs_lists_active_jobs(client: TestClient) -> None:
    manager = FakeRefreshJobManager()
    client.app.state.refresh_job_manager = manager

    response = client.get("/refresh/jobs")

    assert response.status_code == 200
    assert response.json()["items"][0]["job_id"] == "job-batch-1"
    assert manager.active_only_args == [True]


def test_refresh_job_polling_unknown_id_returns_404(client: TestClient) -> None:
    manager = FakeRefreshJobManager()
    client.app.state.refresh_job_manager = manager

    response = client.get("/refresh/jobs/missing-job")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


class FakeReadService:
    def __init__(self) -> None:
        self.list_company_calls: list[dict[str, object]] = []

    def list_companies(self, **kwargs: object) -> SimpleNamespace:
        self.list_company_calls.append(dict(kwargs))
        return SimpleNamespace(
            items=[
                SimpleNamespace(cd_cvm=9512),
                SimpleNamespace(cd_cvm=4170),
                SimpleNamespace(cd_cvm=11223),
            ]
        )

    def list_refresh_status(self) -> list[SimpleNamespace]:
        return [
            SimpleNamespace(
                cd_cvm=9512,
                tracking_state="success",
                last_status="success",
                latest_attempt_outcome="success",
            ),
            SimpleNamespace(
                cd_cvm=4170,
                tracking_state="error",
                last_status="error",
                latest_attempt_outcome="error",
            ),
            SimpleNamespace(
                cd_cvm=11223,
                tracking_state="queued",
                last_status="queued",
                latest_attempt_outcome="queued",
            ),
        ]


def test_refresh_job_manager_reuses_bridge_filter_semantics(api_settings: AppSettings) -> None:
    read_service = FakeReadService()
    manager = ApiRefreshJobManager(
        settings=api_settings,
        read_service=read_service,
        autostart=False,
    )

    result = manager.request_refresh(
        {
            "mode": "failed",
            "sector_slug": "energia",
            "cvm_range": {"start": 4000, "end": 10000},
        }
    )

    assert result["status"] == "queued"
    assert result["queued"] == 1
    job = manager._jobs[str(result["job_id"])]
    assert job["request"]["companies"] == ["4170"]
    assert read_service.list_company_calls == [
        {
            "search": "",
            "sector_slug": "energia",
            "page": 1,
            "page_size": 10000,
        }
    ]


def test_refresh_job_manager_rejects_invalid_mode(api_settings: AppSettings) -> None:
    manager = ApiRefreshJobManager(
        settings=api_settings,
        read_service=FakeReadService(),
        autostart=False,
    )

    with pytest.raises(RefreshBatchRequestError):
        manager.request_refresh({"mode": "unknown"})
