from __future__ import annotations

import json
import time
from pathlib import Path
from types import SimpleNamespace

from apps.api.app.services.refresh_jobs import ApiRefreshJobManager
from desktop.bridge import CVMBridge
from desktop.services import DesktopRefreshJobManager
from src.contracts import CompanyRefreshResult, RefreshResult
from src.settings import build_settings


class FakeReadService:
    def __init__(self, items=None, statuses=None, complete_years=None):
        self.items = items or [SimpleNamespace(cd_cvm=9512)]
        self.statuses = statuses or []
        self.complete_years = complete_years or {}
        self.calls = []

    def list_companies(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(items=tuple(self.items))

    def list_refresh_status(self):
        return tuple(self.statuses)

    def _load_complete_annual_years_map(self, cd_cvms, *, start_year, end_year):
        return {
            int(cd_cvm): tuple(
                int(year)
                for year in self.complete_years.get(int(cd_cvm), ())
                if int(start_year) <= int(year) <= int(end_year)
            )
            for cd_cvm in cd_cvms
        }


class FakeRefreshService:
    def __init__(self):
        self.requests = []

    def execute(
        self,
        request,
        *,
        progress_callback=None,
        stage_callback=None,
        should_cancel=None,
        persist_refresh_status=True,
    ):
        self.requests.append(request)
        if stage_callback is not None:
            stage_callback(
                SimpleNamespace(
                    stage="planning",
                    current=1,
                    total=1,
                    message="Planejamento concluido.",
                )
            )
        if progress_callback is not None:
            progress_callback(1, len(request.companies), f"Processando {request.companies[0]}")
        result = CompanyRefreshResult(
            company_name="PETROBRAS",
            cvm_code=int(request.companies[0]),
            requested_years=(2024,),
            years_processed=(2024,),
            rows_inserted=10,
            status="success",
            attempts=1,
        )
        return RefreshResult(
            request=request,
            companies=(result,),
            planning_stats={"planned_company_years": 1},
            synced_companies=1,
            cancelled=bool(should_cancel and should_cancel()),
        )


def _make_manager(tmp_path: Path, *, read_service=None, refresh_service=None, autostart=True):
    settings = build_settings(project_root=tmp_path)
    return DesktopRefreshJobManager(
        settings=settings,
        read_service=read_service or FakeReadService(),
        refresh_service=refresh_service or FakeRefreshService(),
        jobs_path=tmp_path / "data" / "refresh_jobs.json",
        autostart=autostart,
    )


def _wait_for_terminal(manager: DesktopRefreshJobManager, job_id: str):
    deadline = time.time() + 3
    while time.time() < deadline:
        status = manager.get_refresh_status({"job_id": job_id})
        if status["state"] in DesktopRefreshJobManager.TERMINAL_STATES:
            return status
        time.sleep(0.02)
    raise AssertionError("refresh job did not finish")


def test_request_refresh_dispatches_background_job_and_persists_status(tmp_path: Path):
    refresh_service = FakeRefreshService()
    manager = _make_manager(tmp_path, refresh_service=refresh_service)

    dispatch = manager.request_refresh({"mode": "missing", "sector_slug": "energia", "end_year": 2024})

    assert dispatch["status"] == "running"
    assert dispatch["job_id"]
    assert dispatch["queued"] == 1

    status = _wait_for_terminal(manager, dispatch["job_id"])
    assert status["state"] == "success"
    assert status["processed"] == 1
    assert status["failures"] == 0
    assert status["log_lines"]
    assert refresh_service.requests[0].companies == ("9512",)

    saved = json.loads((tmp_path / "data" / "refresh_jobs.json").read_text(encoding="utf-8"))
    assert saved["jobs"][0]["job_id"] == dispatch["job_id"]
    assert saved["jobs"][0]["state"] == "success"


def test_request_refresh_applies_sector_status_and_cvm_range_filters(tmp_path: Path):
    read_service = FakeReadService(
        items=[
            SimpleNamespace(cd_cvm=99),
            SimpleNamespace(cd_cvm=150),
            SimpleNamespace(cd_cvm=180),
            SimpleNamespace(cd_cvm=250),
        ],
        statuses=[
            SimpleNamespace(cd_cvm=150, tracking_state="error", last_status="error", latest_attempt_outcome="error"),
            SimpleNamespace(cd_cvm=180, tracking_state="success", last_status="success", latest_attempt_outcome="success"),
        ],
    )
    manager = _make_manager(tmp_path, read_service=read_service, autostart=False)

    dispatch = manager.request_refresh(
        {
            "mode": "missing",
            "sector_slug": "varejo",
            "status_filter": "failed",
            "cvm_range": "100-200",
            "start_year": 2023,
            "end_year": 2024,
        }
    )

    assert dispatch["status"] == "queued"
    assert dispatch["queued"] == 1
    assert read_service.calls[0]["sector_slug"] == "varejo"

    saved = json.loads((tmp_path / "data" / "refresh_jobs.json").read_text(encoding="utf-8"))
    assert saved["jobs"][0]["request"] == {
        "companies": ["150"],
        "start_year": 2023,
        "end_year": 2024,
    }


def test_api_and_desktop_batch_refresh_resolve_same_companies(tmp_path: Path):
    items = [
        SimpleNamespace(cd_cvm=100),
        SimpleNamespace(cd_cvm=150),
        SimpleNamespace(cd_cvm=180),
        SimpleNamespace(cd_cvm=250),
    ]
    statuses = [
        SimpleNamespace(
            cd_cvm=100,
            tracking_state="success",
            last_status="success",
            latest_attempt_outcome="success",
            freshness_summary_code="refresh_completed_readable",
            freshness_summary_severity="success",
            has_readable_current_data=True,
            latest_readable_year=2024,
            last_end_year=2024,
        ),
        SimpleNamespace(
            cd_cvm=150,
            tracking_state="success",
            last_status="success",
            latest_attempt_outcome="success",
            freshness_summary_code="mixed_no_new_data_readable",
            freshness_summary_severity="warning",
            has_readable_current_data=True,
            latest_readable_year=2023,
            last_end_year=2023,
        ),
        SimpleNamespace(
            cd_cvm=180,
            tracking_state="error",
            last_status="error",
            latest_attempt_outcome="error",
            is_retry_allowed=True,
            has_readable_current_data=True,
        ),
    ]
    params = {
        "mode": "outdated",
        "sector": "energia",
        "cvm_from": 100,
        "cvm_to": 200,
        "start_year": 2023,
        "end_year": 2024,
    }
    settings = build_settings(project_root=tmp_path)
    api_manager = ApiRefreshJobManager(
        settings=settings,
        read_service=FakeReadService(items=items, statuses=statuses),
        autostart=False,
    )
    desktop_manager = _make_manager(
        tmp_path,
        read_service=FakeReadService(items=items, statuses=statuses),
        autostart=False,
    )

    api_dispatch = api_manager.request_refresh(params)
    desktop_dispatch = desktop_manager.request_refresh(params)

    api_job = api_manager._jobs[str(api_dispatch["job_id"])]
    saved = json.loads((tmp_path / "data" / "refresh_jobs.json").read_text(encoding="utf-8"))
    desktop_job = saved["jobs"][0]
    assert api_dispatch["queued"] == desktop_dispatch["queued"] == 1
    assert api_job["request"] == desktop_job["request"] == {
        "companies": ["150"],
        "start_year": 2023,
        "end_year": 2024,
    }


def test_desktop_refresh_rejects_invalid_batch_range(tmp_path: Path):
    manager = _make_manager(tmp_path, autostart=False)

    dispatch = manager.request_refresh(
        {
            "mode": "full",
            "cvm_range": {"start": 300, "end": 100},
        }
    )

    assert dispatch["status"] == "error"
    assert dispatch["status_reason_code"] == "invalid_request"
    assert "cvm_range.start" in dispatch["message"]


def test_running_jobs_are_marked_interrupted_after_restart(tmp_path: Path):
    jobs_path = tmp_path / "data" / "refresh_jobs.json"
    jobs_path.parent.mkdir(parents=True)
    jobs_path.write_text(
        json.dumps(
            {
                "jobs": [
                    {
                        "job_id": "job-1",
                        "state": "running",
                        "queued": 1,
                        "processed": 0,
                        "failures": 0,
                        "log_lines": [],
                        "created_at": "2026-05-03T12:00:00",
                        "updated_at": "2026-05-03T12:00:00",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    manager = _make_manager(tmp_path, autostart=False)

    status = manager.get_refresh_status({"job_id": "job-1"})
    assert status["state"] == "interrupted"
    assert "encerrado" in status["error"]


def test_bridge_refresh_methods_delegate_to_manager():
    calls = []

    class FakeManager:
        def request_refresh(self, params):
            calls.append(("request", params))
            return {"status": "running", "job_id": "abc"}

        def get_refresh_status(self, params):
            calls.append(("status", params))
            return {"state": "running", "job_id": "abc"}

        def cancel_job(self, params):
            calls.append(("cancel", params))
            return {"ok": True}

    bridge = CVMBridge()
    bridge._refresh_manager = FakeManager()

    assert bridge.request_refresh({"mode": "missing"})["job_id"] == "abc"
    assert bridge.get_refresh_status({"job_id": "abc"})["state"] == "running"
    assert bridge.cancel_refresh({"job_id": "abc"})["ok"] is True
    assert calls == [
        ("request", {"mode": "missing"}),
        ("status", {"job_id": "abc"}),
        ("cancel", {"job_id": "abc"}),
    ]
