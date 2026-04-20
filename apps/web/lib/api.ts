export type HealthResponse = {
  status: string;
  version: string;
  database_dialect: string | null;
  required_tables: string[];
  warnings: Array<{ severity: string; code: string; message: string; path: string | null }>;
  errors: Array<{ severity: string; code: string; message: string; path: string | null }>;
};

export type CompanyDirectoryItem = {
  cd_cvm: number;
  company_name: string;
  ticker_b3: string | null;
  setor_analitico: string | null;
  setor_cvm: string | null;
  sector_name: string;
  sector_slug: string;
  has_financial_data: boolean;
  coverage_rank: number | null;
  anos_disponiveis: number[];
  total_rows: number;
};

export type CompanyDirectoryPage = {
  items: CompanyDirectoryItem[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  applied_filters: {
    search: string;
    sector: string | null;
  };
};

export type CompanySuggestionItem = {
  cd_cvm: number;
  company_name: string;
  ticker_b3: string | null;
  sector_slug: string;
};

export type CompanySectorFilter = {
  sector_name: string;
  sector_slug: string;
  company_count: number;
};

export type CompanyFiltersResponse = {
  sectors: CompanySectorFilter[];
};

export type CompanyInfo = {
  cd_cvm: number;
  company_name: string;
  nome_comercial: string | null;
  cnpj: string | null;
  setor_cvm: string | null;
  setor_analitico: string | null;
  sector_name: string;
  sector_slug: string;
  company_type: string | null;
  ticker_b3: string | null;
};

export type RefreshDispatchResponse = {
  status: "dispatched" | "dispatch_failed";
  cd_cvm: number;
};

export type RefreshStatusItem = {
  cd_cvm: number;
  company_name: string;
  source_scope: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_start_year: number | null;
  last_end_year: number | null;
  last_rows_inserted: number | null;
  updated_at: string | null;
};

export type TabularDataRow = Record<string, string | number | boolean | null>;

export type TabularData = {
  columns: string[];
  rows: TabularDataRow[];
};

export type KPIBundle = {
  cd_cvm: number;
  years: number[];
  annual: TabularData;
  quarterly: TabularData;
};

export type StatementMatrix = {
  cd_cvm: number;
  statement_type: string;
  years: number[];
  table: TabularData;
  exclude_conflicts: boolean;
};

export type SectorSnapshot = {
  roe: number | null;
  mg_ebit: number | null;
  mg_liq: number | null;
};

export type SectorDirectoryItem = {
  sector_name: string;
  sector_slug: string;
  company_count: number;
  latest_year: number | null;
  snapshot: SectorSnapshot;
};

export type SectorDirectory = {
  items: SectorDirectoryItem[];
};

export type SectorYearOverview = {
  year: number;
  roe: number | null;
  mg_ebit: number | null;
  mg_liq: number | null;
};

export type SectorCompanyMetric = {
  cd_cvm: number;
  company_name: string;
  ticker_b3: string | null;
  roe: number | null;
  mg_ebit: number | null;
  mg_liq: number | null;
};

export type SectorDetail = {
  sector_name: string;
  sector_slug: string;
  company_count: number;
  available_years: number[];
  selected_year: number;
  yearly_overview: SectorYearOverview[];
  companies: SectorCompanyMetric[];
};

type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
  };
  detail?:
    | {
        code?: string;
        message?: string;
      }
    | string;
};

type ApiFetchOptions<T> = {
  allowNotFound?: boolean;
  validate?: (payload: unknown) => payload is T;
  invalidResponseMessage?: string;
  request?: ApiReadRequestInit;
};

type ApiReadRequestInit = {
  cache?: RequestCache;
  next?: {
    revalidate: number;
  };
};

export type ApiErrorCode =
  | "network_error"
  | "upstream_unavailable"
  | "invalid_response"
  | "not_found"
  | "invalid_request"
  | "unknown_error"
  | string;

export class ApiClientError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode = "unknown_error",
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const UNCACHED_API_READ: ApiReadRequestInit = {
  cache: "no-store",
};

// Keep these frontend data-cache TTLs aligned with the backend Cache-Control
// contract delivered by the API layer.
const COMPANY_DIRECTORY_API_READ: ApiReadRequestInit = {
  next: { revalidate: 300 },
};
const COMPANY_FILTERS_API_READ: ApiReadRequestInit = {
  next: { revalidate: 3600 },
};
const COMPANY_INFO_API_READ: ApiReadRequestInit = {
  next: { revalidate: 3600 },
};
const COMPANY_YEARS_API_READ: ApiReadRequestInit = {
  next: { revalidate: 86400 },
};
const COMPANY_DATA_API_READ: ApiReadRequestInit = {
  next: { revalidate: 600 },
};
const SECTOR_DIRECTORY_API_READ: ApiReadRequestInit = {
  next: { revalidate: 3600 },
};
const SECTOR_DETAIL_API_READ: ApiReadRequestInit = {
  next: { revalidate: 3600 },
};

export function getApiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function buildApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

export function buildApiUrlFromBase(baseUrl: string, path: string): string {
  const normalizedBaseUrl = `${baseUrl.replace(/\/$/, "")}/`;
  const normalizedPath = path.replace(/^\//, "");
  return new URL(normalizedPath, normalizedBaseUrl).toString();
}

function resolveApiReadRequest(
  request: ApiReadRequestInit | undefined,
): ApiReadRequestInit {
  return request ?? UNCACHED_API_READ;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTabularData(value: unknown): value is TabularData {
  return (
    isRecord(value) &&
    isStringArray(value.columns) &&
    Array.isArray(value.rows)
  );
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    typeof value.version === "string" &&
    Array.isArray(value.required_tables) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors)
  );
}

function isCompanyDirectoryPage(value: unknown): value is CompanyDirectoryPage {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    isRecord(value.pagination) &&
    typeof value.pagination.page === "number" &&
    typeof value.pagination.page_size === "number" &&
    typeof value.pagination.total_items === "number" &&
    typeof value.pagination.total_pages === "number" &&
    typeof value.pagination.has_next === "boolean" &&
    typeof value.pagination.has_previous === "boolean" &&
    isRecord(value.applied_filters) &&
    typeof value.applied_filters.search === "string"
  );
}

function isCompanyFiltersResponse(value: unknown): value is CompanyFiltersResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.sectors)
  );
}

function isCompanyInfo(value: unknown): value is CompanyInfo {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    typeof value.company_name === "string" &&
    typeof value.sector_name === "string" &&
    typeof value.sector_slug === "string"
  );
}

function isRefreshDispatchResponse(value: unknown): value is RefreshDispatchResponse {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    (value.status === "dispatched" || value.status === "dispatch_failed")
  );
}

function isKPIBundle(value: unknown): value is KPIBundle {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    isNumberArray(value.years) &&
    isTabularData(value.annual) &&
    isTabularData(value.quarterly)
  );
}

function isStatementMatrix(value: unknown): value is StatementMatrix {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    typeof value.statement_type === "string" &&
    isNumberArray(value.years) &&
    isTabularData(value.table) &&
    typeof value.exclude_conflicts === "boolean"
  );
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isRefreshStatusItem(value: unknown): value is RefreshStatusItem {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    typeof value.company_name === "string" &&
    isNullableString(value.source_scope) &&
    isNullableString(value.last_attempt_at) &&
    isNullableString(value.last_success_at) &&
    isNullableString(value.last_status) &&
    isNullableString(value.last_error) &&
    isNullableNumber(value.last_start_year) &&
    isNullableNumber(value.last_end_year) &&
    isNullableNumber(value.last_rows_inserted) &&
    isNullableString(value.updated_at)
  );
}

function isRefreshStatusList(value: unknown): value is RefreshStatusItem[] {
  return Array.isArray(value) && value.every((item) => isRefreshStatusItem(item));
}

function isSectorSnapshot(value: unknown): value is SectorSnapshot {
  return (
    isRecord(value) &&
    isNullableNumber(value.roe) &&
    isNullableNumber(value.mg_ebit) &&
    isNullableNumber(value.mg_liq)
  );
}

function isSectorDirectory(value: unknown): value is SectorDirectory {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.sector_name === "string" &&
        typeof item.sector_slug === "string" &&
        typeof item.company_count === "number" &&
        isNullableNumber(item.latest_year) &&
        isSectorSnapshot(item.snapshot),
    )
  );
}

function isSectorDetail(value: unknown): value is SectorDetail {
  return (
    isRecord(value) &&
    typeof value.sector_name === "string" &&
    typeof value.sector_slug === "string" &&
    typeof value.company_count === "number" &&
    isNumberArray(value.available_years) &&
    typeof value.selected_year === "number" &&
    Array.isArray(value.yearly_overview) &&
    value.yearly_overview.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.year === "number" &&
        isNullableNumber(entry.roe) &&
        isNullableNumber(entry.mg_ebit) &&
        isNullableNumber(entry.mg_liq),
    ) &&
    Array.isArray(value.companies) &&
    value.companies.every(
      (company) =>
        isRecord(company) &&
        typeof company.cd_cvm === "number" &&
        typeof company.company_name === "string" &&
        (company.ticker_b3 === null || typeof company.ticker_b3 === "string") &&
        isNullableNumber(company.roe) &&
        isNullableNumber(company.mg_ebit) &&
        isNullableNumber(company.mg_liq),
    )
  );
}

function isFetchFailureMessage(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized.includes("fetch failed") || normalized.includes("failed to fetch");
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function getUserFacingErrorCopy(error: unknown): {
  title: string;
  message: string;
} {
  if (isApiClientError(error)) {
    switch (error.code) {
      case "network_error":
        return {
          title: "API indisponivel",
          message:
            "Nao foi possivel conectar a API da V2. Verifique se o backend esta no ar e tente novamente.",
        };
      case "upstream_unavailable":
        return {
          title: "Servico temporariamente indisponivel",
          message:
            "A API da V2 nao conseguiu concluir esta solicitacao agora. Tente novamente em instantes.",
        };
      case "invalid_response":
        return {
          title: "Resposta invalida da API",
          message:
            "A API respondeu com um formato invalido ou incompleto. Tente novamente em instantes.",
        };
      case "not_found":
        return {
          title: "Recurso nao encontrado",
          message: error.message || "O recurso solicitado nao foi encontrado.",
        };
      case "invalid_request":
        return {
          title: "Requisicao invalida",
          message: error.message || "A requisicao enviada para a API nao foi aceita.",
        };
      default:
        return {
          title: "Falha na leitura web",
          message:
            error.message || "Nao foi possivel concluir esta leitura agora. Tente novamente em instantes.",
        };
    }
  }

  if (error instanceof Error && isFetchFailureMessage(error.message)) {
    return {
      title: "API indisponivel",
      message:
        "Nao foi possivel conectar a API da V2. Verifique se o backend esta no ar e tente novamente.",
    };
  }

  return {
    title: "Falha na leitura web",
    message: "Nao foi possivel concluir esta leitura agora. Tente novamente em instantes.",
  };
}

export function getUserFacingErrorMessage(error: unknown): string {
  return getUserFacingErrorCopy(error).message;
}

async function toApiError(response: Response): Promise<ApiClientError> {
  let payload: ApiErrorShape | null = null;

  try {
    payload = (await response.json()) as ApiErrorShape;
  } catch {
    payload = null;
  }

  const rawCode = payload?.error?.code;
  const rawMessage = payload?.error?.message;
  const detailCode =
    isRecord(payload?.detail) && typeof payload.detail.code === "string"
      ? payload.detail.code
      : undefined;
  const detailMessage =
    isRecord(payload?.detail) && typeof payload.detail.message === "string"
      ? payload.detail.message
      : typeof payload?.detail === "string"
        ? payload.detail
        : undefined;
  const code = rawCode ?? detailCode;
  const message = rawMessage ?? detailMessage;

  if (response.status === 404) {
    return new ApiClientError(
      message ?? "O recurso solicitado nao foi encontrado.",
      response.status,
      code ?? "not_found",
    );
  }

  if (response.status === 429) {
    return new ApiClientError(
      message ?? "Solicitacao ja em andamento.",
      response.status,
      code ?? "refresh_already_queued",
    );
  }

  if (response.status === 422) {
    return new ApiClientError(
      message ?? "A requisicao enviada para a API nao foi aceita.",
      response.status,
      code ?? "invalid_request",
    );
  }

  if (response.status >= 500) {
    return new ApiClientError(
      message ?? "A API da V2 esta indisponivel no momento.",
      response.status,
      "upstream_unavailable",
    );
  }

  return new ApiClientError(
    message ?? `Falha ao consultar a API (${response.status}).`,
    response.status,
    code ?? "unknown_error",
  );
}

async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions<T>,
): Promise<T | null> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...resolveApiReadRequest(options?.request),
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    throw new ApiClientError(
      isFetchFailureMessage(error instanceof Error ? error.message : undefined)
        ? "Nao foi possivel conectar a API da V2."
        : "A conexao com a API da V2 falhou.",
      503,
      "network_error",
    );
  }

  if (options?.allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      options?.invalidResponseMessage ?? "A API retornou um corpo invalido.",
      response.status,
      "invalid_response",
    );
  }

  if (options?.validate && !options.validate(payload)) {
    throw new ApiClientError(
      options.invalidResponseMessage ?? "A API retornou um formato invalido.",
      response.status,
      "invalid_response",
    );
  }

  return payload as T;
}

async function routeFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions<T>,
): Promise<T | null> {
  let response: Response;

  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");

    response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers,
    });
  } catch (error) {
    throw new ApiClientError(
      isFetchFailureMessage(error instanceof Error ? error.message : undefined)
        ? "Nao foi possivel conectar o frontend a rota de refresh."
        : "A conexao com a rota de refresh falhou.",
      503,
      "network_error",
    );
  }

  if (options?.allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      options?.invalidResponseMessage ?? "A rota retornou um corpo invalido.",
      response.status,
      "invalid_response",
    );
  }

  if (options?.validate && !options.validate(payload)) {
    throw new ApiClientError(
      options.invalidResponseMessage ?? "A rota retornou um formato invalido.",
      response.status,
      "invalid_response",
    );
  }

  return payload as T;
}

function buildQuery(
  params: Record<string, string | number | null | undefined>,
): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });

  const search = query.toString();
  return search ? `?${search}` : "";
}

export async function fetchHealth(): Promise<HealthResponse> {
  return (await apiFetch<HealthResponse>("/health", {
    request: UNCACHED_API_READ,
    validate: isHealthResponse,
    invalidResponseMessage: "A API retornou um healthcheck invalido.",
  })) as HealthResponse;
}

export async function safeFetchHealth(): Promise<HealthResponse | null> {
  try {
    return await fetchHealth();
  } catch {
    return null;
  }
}

export async function fetchCompanies(params: {
  search?: string;
  sector?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<CompanyDirectoryPage> {
  return (await apiFetch<CompanyDirectoryPage>(
    `/companies${buildQuery({
      search: params.search,
      sector: params.sector,
      page: params.page,
      page_size: params.pageSize,
    })}`,
    {
      request: COMPANY_DIRECTORY_API_READ,
      validate: isCompanyDirectoryPage,
      invalidResponseMessage: "A API retornou um diretorio de empresas invalido.",
    },
  )) as CompanyDirectoryPage;
}

export async function fetchCompanyFilters(): Promise<CompanyFiltersResponse> {
  return (await apiFetch<CompanyFiltersResponse>(
    "/companies/filters",
    {
      request: COMPANY_FILTERS_API_READ,
      validate: isCompanyFiltersResponse,
      invalidResponseMessage: "A API retornou filtros de empresas invalidos.",
    },
  )) as CompanyFiltersResponse;
}

export async function fetchSectorDirectory(): Promise<SectorDirectory> {
  return (await apiFetch<SectorDirectory>("/sectors", {
    request: SECTOR_DIRECTORY_API_READ,
    validate: isSectorDirectory,
    invalidResponseMessage: "A API retornou um diretorio de setores invalido.",
  })) as SectorDirectory;
}

export async function fetchSectorDetail(
  sectorSlug: string,
  year?: number,
): Promise<SectorDetail | null> {
  return apiFetch<SectorDetail>(
    `/sectors/${sectorSlug}${buildQuery({ year })}`,
    {
      allowNotFound: true,
      request: SECTOR_DETAIL_API_READ,
      validate: isSectorDetail,
      invalidResponseMessage: "A API retornou um detalhe setorial invalido.",
    },
  );
}

export async function fetchCompanyInfo(
  cdCvm: number,
): Promise<CompanyInfo | null> {
  return apiFetch<CompanyInfo>(`/companies/${cdCvm}`, {
    allowNotFound: true,
    request: COMPANY_INFO_API_READ,
    validate: isCompanyInfo,
    invalidResponseMessage: "A API retornou um detalhe de empresa invalido.",
  });
}

export async function fetchCompanyYears(cdCvm: number): Promise<number[]> {
  return (await apiFetch<number[]>(`/companies/${cdCvm}/years`, {
    request: COMPANY_YEARS_API_READ,
    validate: isNumberArray,
    invalidResponseMessage: "A API retornou anos invalidos para a empresa.",
  })) as number[];
}

export async function fetchCompanyKpis(
  cdCvm: number,
  years: number[],
): Promise<KPIBundle> {
  return (await apiFetch<KPIBundle>(
    `/companies/${cdCvm}/kpis${buildQuery({
      years: years.join(","),
    })}`,
    {
      request: COMPANY_DATA_API_READ,
      validate: isKPIBundle,
      invalidResponseMessage: "A API retornou KPIs invalidos para a empresa.",
    },
  )) as KPIBundle;
}

export async function fetchCompanyStatement(
  cdCvm: number,
  years: number[],
  statementType: string,
): Promise<StatementMatrix> {
  return (await apiFetch<StatementMatrix>(
    `/companies/${cdCvm}/statements${buildQuery({
      stmt: statementType,
      years: years.join(","),
    })}`,
    {
      request: COMPANY_DATA_API_READ,
      validate: isStatementMatrix,
      invalidResponseMessage: "A API retornou uma demonstracao invalida para a empresa.",
    },
  )) as StatementMatrix;
}

export async function fetchRequestRefresh(
  cdCvm: number,
): Promise<RefreshDispatchResponse> {
  return (await routeFetch<RefreshDispatchResponse>(
    `/api/request-refresh/${cdCvm}`,
    {
      method: "POST",
    },
    {
      validate: isRefreshDispatchResponse,
      invalidResponseMessage:
        "A rota interna retornou um payload invalido para o dispatch on-demand.",
    },
  )) as RefreshDispatchResponse;
}

export async function fetchRefreshStatus(
  cdCvm: number,
): Promise<RefreshStatusItem[]> {
  return (await routeFetch<RefreshStatusItem[]>(
    `/api/refresh-status/${cdCvm}`,
    undefined,
    {
      validate: isRefreshStatusList,
      invalidResponseMessage:
        "A rota interna retornou um status invalido para o refresh on-demand.",
    },
  )) as RefreshStatusItem[];
}
