from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.responses import Response

from apps.api.app.dependencies import (
    InvalidRequestError,
    NotFoundError,
    company_ids_dependency,
    coerce_company,
    ensure_api_ready,
    get_read_service,
    get_settings,
    statement_dependency,
    years_dependency,
)
from apps.api.app.presenters import (
    CompanyDirectoryPagePayload,
    CompanyFiltersPayload,
    CompanyInfoPayload,
    KPIBundlePayload,
    RankedRefreshQueuePayload,
    RefreshDispatchPayload,
    StatementMatrixPayload,
    StatementSummaryPayload,
    present_company_directory_page,
    present_company_filters,
    present_company_info,
    present_kpis,
    present_ranked_refresh_queue,
    present_statement,
    present_statement_summary,
)
from src.read_service import CVMReadService

router = APIRouter(tags=["companies"])

COMPANY_DIRECTORY_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"
COMPANY_FILTERS_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400"
COMPANY_INFO_CACHE_CONTROL = "public, max-age=3600"
COMPANY_YEARS_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800"
COMPANY_DATA_CACHE_CONTROL = "public, max-age=600"


def _apply_cache_headers(response: Response, cache_control: str) -> None:
    response.headers["Cache-Control"] = cache_control
    vary_values = [value.strip() for value in response.headers.get("Vary", "").split(",") if value.strip()]
    if not any(value.lower() == "origin" for value in vary_values):
        vary_values.append("Origin")
    response.headers["Vary"] = ", ".join(vary_values)


@router.get(
    "/companies",
    response_model=CompanyDirectoryPagePayload,
    summary="Retorna o diretorio paginado de empresas com dados.",
)
def list_companies(
    response: Response,
    request: Request,
    search: str = Query(default="", description="Filtro livre por nome, ticker ou codigo CVM."),
    sector: str | None = Query(default=None, description="Slug canonico do setor."),
    page: int = Query(default=1, ge=1, description="Pagina atual."),
    page_size: int = Query(default=20, ge=1, le=100, description="Tamanho da pagina."),
    service: CVMReadService = Depends(get_read_service),
) -> CompanyDirectoryPagePayload:
    ensure_api_ready(get_settings(request))
    _apply_cache_headers(response, COMPANY_DIRECTORY_CACHE_CONTROL)
    page_dto = service.list_companies(
        search=search,
        sector_slug=sector,
        page=page,
        page_size=page_size,
    )
    return present_company_directory_page(page_dto)


@router.get(
    "/companies/filters",
    response_model=CompanyFiltersPayload,
    summary="Lista as opcoes canonicas de filtro do hub de empresas.",
)
def get_company_filters(
    request: Request,
    response: Response,
    service: CVMReadService = Depends(get_read_service),
) -> CompanyFiltersPayload:
    ensure_api_ready(get_settings(request))
    _apply_cache_headers(response, COMPANY_FILTERS_CACHE_CONTROL)
    return present_company_filters(service.get_company_filters())


@router.get(
    "/companies/export/excel-batch",
    summary="Retorna um arquivo ZIP com um workbook Excel por empresa selecionada.",
)
def export_companies_excel_batch(
    request: Request,
    ids: list[int] = Depends(company_ids_dependency),
    service: CVMReadService = Depends(get_read_service),
) -> Response:
    ensure_api_ready(get_settings(request))
    for cd_cvm in ids:
        coerce_company(cd_cvm, service)
    try:
        filename, payload = service.build_companies_excel_batch_export(ids)
    except ValueError as exc:
        raise InvalidRequestError(str(exc)) from exc

    return Response(
        content=payload,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post(
    "/companies/{cd_cvm}/request-refresh",
    response_model=RefreshDispatchPayload,
    status_code=202,
    summary="Dispara ingestao on-demand para uma empresa.",
)
def request_company_refresh(
    request: Request,
    cd_cvm: int = Path(...),
    service: CVMReadService = Depends(get_read_service),
) -> RefreshDispatchPayload:
    ensure_api_ready(get_settings(request))
    result = service.request_company_refresh(cd_cvm)
    if result == "already_queued":
        raise HTTPException(status_code=429, detail={"code": "refresh_already_queued"})
    return RefreshDispatchPayload(status=result, cd_cvm=cd_cvm)


@router.post(
    "/companies/request-refresh/top-ranked",
    response_model=RankedRefreshQueuePayload,
    status_code=202,
    summary="Enfileira o backlog historico das empresas mais relevantes por coverage_rank.",
)
def request_top_ranked_refresh(
    request: Request,
    limit: int = Query(default=80, ge=1, le=80, description="Quantidade maxima de empresas ranqueadas."),
    start_year: int = Query(default=2010, description="Ano inicial da fila historica."),
    end_year: int | None = Query(default=None, description="Ano final da fila historica. Default: ultimo ano fechado."),
    service: CVMReadService = Depends(get_read_service),
) -> RankedRefreshQueuePayload:
    ensure_api_ready(get_settings(request))
    try:
        dto = service.request_top_ranked_historical_refresh(
            limit=limit,
            start_year=start_year,
            end_year=end_year,
        )
    except ValueError as exc:
        raise InvalidRequestError(str(exc)) from exc
    return present_ranked_refresh_queue(dto)


@router.get(
    "/companies/{cd_cvm}",
    response_model=CompanyInfoPayload,
    summary="Retorna os metadados principais de uma empresa.",
)
def get_company(
    cd_cvm: int,
    response: Response,
    request: Request,
    service: CVMReadService = Depends(get_read_service),
) -> CompanyInfoPayload:
    ensure_api_ready(get_settings(request))
    info = service.get_company_info(cd_cvm)
    if info is None:
        raise NotFoundError(f"Empresa {cd_cvm} nao encontrada.")
    _apply_cache_headers(response, COMPANY_INFO_CACHE_CONTROL)
    return present_company_info(info)


@router.get(
    "/companies/{cd_cvm}/export/excel",
    summary="Retorna o workbook Excel completo da empresa para download.",
)
def export_company_excel(
    cd_cvm: int,
    request: Request,
    service: CVMReadService = Depends(get_read_service),
) -> Response:
    ensure_api_ready(get_settings(request))
    coerce_company(cd_cvm, service)
    try:
        filename, payload = service.build_company_excel_export(cd_cvm)
    except ValueError as exc:
        raise InvalidRequestError(str(exc)) from exc

    return Response(
        content=payload,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get(
    "/companies/{cd_cvm}/years",
    response_model=list[int],
    summary="Lista os anos disponiveis para a empresa.",
)
def get_company_years(
    cd_cvm: int,
    response: Response,
    request: Request,
    service: CVMReadService = Depends(get_read_service),
) -> list[int]:
    ensure_api_ready(get_settings(request))
    coerce_company(cd_cvm, service)
    _apply_cache_headers(response, COMPANY_YEARS_CACHE_CONTROL)
    return service.get_available_years(cd_cvm)


@router.get(
    "/companies/{cd_cvm}/statements",
    response_model=StatementMatrixPayload,
    summary="Retorna a demonstracao financeira em formato tabular.",
)
def get_company_statement(
    cd_cvm: int,
    response: Response,
    request: Request,
    stmt: str = Depends(statement_dependency),
    years: list[int] = Depends(years_dependency),
    service: CVMReadService = Depends(get_read_service),
) -> StatementMatrixPayload:
    ensure_api_ready(get_settings(request))
    coerce_company(cd_cvm, service)
    _apply_cache_headers(response, COMPANY_DATA_CACHE_CONTROL)
    matrix = service.get_statement_matrix(cd_cvm=cd_cvm, years=years, stmt_type=stmt)
    return present_statement(matrix)


@router.get(
    "/companies/{cd_cvm}/kpis",
    response_model=KPIBundlePayload,
    summary="Retorna os bundles anuais e trimestrais de KPIs.",
)
def get_company_kpis(
    cd_cvm: int,
    response: Response,
    request: Request,
    years: list[int] = Depends(years_dependency),
    service: CVMReadService = Depends(get_read_service),
) -> KPIBundlePayload:
    ensure_api_ready(get_settings(request))
    coerce_company(cd_cvm, service)
    _apply_cache_headers(response, COMPANY_DATA_CACHE_CONTROL)
    bundle = service.get_kpi_bundle(cd_cvm=cd_cvm, years=years)
    return present_kpis(bundle)


@router.get(
    "/companies/{cd_cvm}/summary",
    response_model=StatementSummaryPayload,
    summary="Retorna o resumo condensado multi-bloco das demonstracoes financeiras.",
)
def get_company_summary(
    cd_cvm: int,
    request: Request,
    years: list[int] = Depends(years_dependency),
    service: CVMReadService = Depends(get_read_service),
) -> StatementSummaryPayload:
    ensure_api_ready(get_settings(request))
    coerce_company(cd_cvm, service)
    dto = service.get_statement_summary(cd_cvm=cd_cvm, years=years)
    return present_statement_summary(dto)
