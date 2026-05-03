from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Path, Request
from pydantic import BaseModel, Field

from apps.api.app.dependencies import (
    InvalidRequestError,
    NotFoundError,
    ensure_api_ready,
    get_settings,
)
from apps.api.app.services.refresh_jobs import ApiRefreshJobManager, RefreshBatchRequestError

router = APIRouter(prefix="/refresh", tags=["operations"])


class RefreshBatchRequestPayload(BaseModel):
    mode: str = Field(default="missing", description="full, missing, outdated ou failed.")
    sector_slug: str | None = None
    cvm_range: dict[str, int] | list[int] | str | None = None
    status_filter: str | None = None
    search: str | None = None
    cd_cvm: int | None = None
    start_year: int | None = None
    end_year: int | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)


class RefreshBatchAcceptedPayload(BaseModel):
    job_id: str | None = None
    status: str
    accepted_at: str | None = None
    queued: int = 0
    message: str | None = None
    status_reason_code: str | None = None
    is_retry_allowed: bool = False


class RefreshJobPayload(BaseModel):
    job_id: str
    state: str
    status: str
    stage: str | None = None
    queued: int
    processed: int
    failures: int
    current_cvm: int | None = None
    progress_current: int | None = None
    progress_total: int | None = None
    log_lines: list[str]
    accepted_at: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    updated_at: str | None = None
    error: str | None = None
    result: dict[str, Any] | None = None


class RefreshJobListPayload(BaseModel):
    items: list[RefreshJobPayload]


def get_refresh_job_manager(request: Request) -> ApiRefreshJobManager:
    manager = getattr(request.app.state, "refresh_job_manager", None)
    if manager is None:
        raise RuntimeError("refresh_job_manager is not configured")
    return manager


@router.post(
    "/batch",
    response_model=RefreshBatchAcceptedPayload,
    status_code=202,
    summary="Dispara refresh em lote em background.",
)
def request_batch_refresh(
    payload: RefreshBatchRequestPayload,
    request: Request,
    manager: ApiRefreshJobManager = Depends(get_refresh_job_manager),
) -> RefreshBatchAcceptedPayload:
    ensure_api_ready(get_settings(request))
    try:
        result = manager.request_refresh(payload.model_dump(exclude_none=True))
    except RefreshBatchRequestError as exc:
        raise InvalidRequestError(str(exc)) from exc
    return RefreshBatchAcceptedPayload(**result)


@router.get(
    "/jobs",
    response_model=RefreshJobListPayload,
    summary="Lista os jobs ativos de refresh em lote.",
)
def list_refresh_jobs(
    request: Request,
    manager: ApiRefreshJobManager = Depends(get_refresh_job_manager),
) -> RefreshJobListPayload:
    ensure_api_ready(get_settings(request))
    return RefreshJobListPayload(items=manager.list_jobs(active_only=True))


@router.get(
    "/jobs/{job_id}",
    response_model=RefreshJobPayload,
    summary="Retorna o progresso de um job de refresh em lote.",
)
def get_refresh_job(
    request: Request,
    job_id: str = Path(...),
    manager: ApiRefreshJobManager = Depends(get_refresh_job_manager),
) -> RefreshJobPayload:
    ensure_api_ready(get_settings(request))
    job = manager.get_job(job_id)
    if job is None:
        raise NotFoundError(f"Job de refresh {job_id} nao encontrado.")
    return RefreshJobPayload(**job)
