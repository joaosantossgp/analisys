from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from apps.api.app.dependencies import (
    InvalidRequestError,
    NotFoundError,
    ensure_api_ready,
    get_read_service,
    get_settings,
    optional_year_dependency,
)
from apps.api.app.presenters import (
    SectorDetailPayload,
    SectorDirectoryPayload,
    present_sector_detail,
    present_sector_directory,
)
from src.read_service import CVMReadService

router = APIRouter(tags=["sectors"])

SECTOR_DIRECTORY_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400"


def _apply_cache_headers(response: Response, cache_control: str) -> None:
    response.headers["Cache-Control"] = cache_control
    vary_values = [value.strip() for value in response.headers.get("Vary", "").split(",") if value.strip()]
    if not any(value.lower() == "origin" for value in vary_values):
        vary_values.append("Origin")
    response.headers["Vary"] = ", ".join(vary_values)


@router.get(
    "/sectors",
    response_model=SectorDirectoryPayload,
    summary="Retorna o hub setorial com snapshot agregado por setor.",
)
def list_sectors(
    response: Response,
    request: Request,
    service: CVMReadService = Depends(get_read_service),
) -> SectorDirectoryPayload:
    ensure_api_ready(get_settings(request))
    _apply_cache_headers(response, SECTOR_DIRECTORY_CACHE_CONTROL)
    return present_sector_directory(service.list_sectors())


@router.get(
    "/sectors/{sector_slug}",
    response_model=SectorDetailPayload,
    summary="Retorna o detalhe de um setor com serie anual e empresas do ano selecionado.",
)
def get_sector_detail(
    sector_slug: str,
    request: Request,
    year: int | None = Depends(optional_year_dependency),
    service: CVMReadService = Depends(get_read_service),
) -> SectorDetailPayload:
    ensure_api_ready(get_settings(request))
    try:
        detail = service.get_sector_detail(sector_slug=sector_slug, year=year)
    except ValueError as exc:
        raise InvalidRequestError(str(exc)) from exc

    if detail is None:
        raise NotFoundError(f"Setor '{sector_slug}' nao encontrado.")

    return present_sector_detail(detail)
