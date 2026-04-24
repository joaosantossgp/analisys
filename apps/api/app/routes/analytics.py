from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from apps.api.app.dependencies import ensure_api_ready, get_read_service, get_settings
from src.read_service import CVMReadService

router = APIRouter(tags=["analytics"])


class CompanyViewRequest(BaseModel):
    cd_cvm: int = Field(..., description="Codigo CVM da empresa visualizada.")


@router.post(
    "/analytics/company-view",
    status_code=204,
    summary="Registra uma visualizacao de empresa para o ranking de destaques.",
    response_class=Response,
)
def record_company_view(
    request: Request,
    body: CompanyViewRequest,
    service: CVMReadService = Depends(get_read_service),
) -> None:
    ensure_api_ready(get_settings(request))
    service.record_company_view(body.cd_cvm)
