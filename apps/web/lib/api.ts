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

export type CompanySuggestionsResponse = {
  items: CompanySuggestionItem[];
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
  read_model_updated_at: string | null;
  has_readable_current_data: boolean;
  readable_years_count: number;
  latest_readable_year: number | null;
  read_availability_code: string | null;
  read_availability_message: string | null;
};

export type RefreshDispatchResponse = {
  status: "queued" | "already_current";
  cd_cvm: number;
  job_id: string | null;
  accepted_at: string;
  message: string;
  status_reason_code: string | null;
  status_reason_message: string | null;
  is_retry_allowed: boolean;
};

export type RefreshStatusItem = {
  cd_cvm: number;
  company_name: string;
  source_scope: string | null;
  job_id: string | null;
  stage: string | null;
  queue_position: number | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_start_year: number | null;
  last_end_year: number | null;
  last_rows_inserted: number | null;
  progress_current: number | null;
  progress_total: number | null;
  progress_message: string | null;
  started_at: string | null;
  heartbeat_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
  read_model_updated_at: string | null;
  estimated_progress_pct: number | null;
  estimated_eta_seconds: number | null;
  estimated_total_seconds: number | null;
  elapsed_seconds: number | null;
  estimated_completion_at: string | null;
  estimate_confidence: string | null;
  tracking_state: string | null;
  progress_mode: string | null;
  is_retry_allowed: boolean;
  status_reason_code: string | null;
  status_reason_message: string | null;
  has_readable_current_data: boolean;
  readable_years_count: number;
  latest_readable_year: number | null;
  latest_attempt_outcome: string | null;
  latest_attempt_reason_code: string | null;
  latest_attempt_reason_message: string | null;
  latest_attempt_retryable: boolean;
  read_availability_code: string | null;
  read_availability_message: string | null;
  freshness_summary_code: string | null;
  freshness_summary_message: string | null;
  freshness_summary_severity: string | null;
  source_label: string | null;
};

type RawCompanyInfo = Omit<
  CompanyInfo,
  | "read_model_updated_at"
  | "has_readable_current_data"
  | "readable_years_count"
  | "latest_readable_year"
  | "read_availability_code"
  | "read_availability_message"
> & {
  read_model_updated_at?: string | null;
  has_readable_current_data?: boolean;
  readable_years_count?: number;
  latest_readable_year?: number | null;
  read_availability_code?: string | null;
  read_availability_message?: string | null;
};

type RawRefreshStatusItem = Omit<
  RefreshStatusItem,
  | "read_model_updated_at"
  | "estimated_progress_pct"
  | "estimated_eta_seconds"
  | "estimated_total_seconds"
  | "elapsed_seconds"
  | "estimated_completion_at"
  | "estimate_confidence"
  | "tracking_state"
  | "progress_mode"
  | "is_retry_allowed"
  | "status_reason_code"
  | "status_reason_message"
  | "has_readable_current_data"
  | "readable_years_count"
  | "latest_readable_year"
  | "latest_attempt_outcome"
  | "latest_attempt_reason_code"
  | "latest_attempt_reason_message"
  | "latest_attempt_retryable"
  | "read_availability_code"
  | "read_availability_message"
  | "freshness_summary_code"
  | "freshness_summary_message"
  | "freshness_summary_severity"
  | "source_label"
> & {
  job_id?: string | null;
  stage?: string | null;
  queue_position?: number | null;
  progress_current?: number | null;
  progress_total?: number | null;
  progress_message?: string | null;
  started_at?: string | null;
  heartbeat_at?: string | null;
  finished_at?: string | null;
  read_model_updated_at?: string | null;
  estimated_progress_pct?: number | null;
  estimated_eta_seconds?: number | null;
  estimated_total_seconds?: number | null;
  elapsed_seconds?: number | null;
  estimated_completion_at?: string | null;
  estimate_confidence?: string | null;
  tracking_state?: string | null;
  progress_mode?: string | null;
  is_retry_allowed?: boolean;
  status_reason_code?: string | null;
  status_reason_message?: string | null;
  has_readable_current_data?: boolean;
  readable_years_count?: number;
  latest_readable_year?: number | null;
  latest_attempt_outcome?: string | null;
  latest_attempt_reason_code?: string | null;
  latest_attempt_reason_message?: string | null;
  latest_attempt_retryable?: boolean;
  read_availability_code?: string | null;
  read_availability_message?: string | null;
  freshness_summary_code?: string | null;
  freshness_summary_message?: string | null;
  freshness_summary_severity?: string | null;
  source_label?: string | null;
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

export { isDesktopMode } from "./desktop-bridge.ts";
import {
  isDesktopMode,
  bridgeFetchCompanies,
  bridgeFetchPopulares,
  bridgeFetchEmDestaque,
  bridgeFetchCompanyFilters,
  bridgeFetchCompanySuggestions,
  bridgeFetchCompanyInfo,
  bridgeFetchCompanyYears,
  bridgeFetchCompanyKpis,
  bridgeFetchCompanyStatement,
  bridgeFetchSectors,
  bridgeFetchSectorDetail,
  bridgeFetchHealth,
  bridgeTrackCompanyView,
  bridgeFetchRefreshStatus,
  bridgeRequestRefresh,
} from "./desktop-bridge.ts";

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
const COMPANY_POPULARES_API_READ: ApiReadRequestInit = {
  next: { revalidate: 3600 },
};
const COMPANY_DESTAQUE_API_READ: ApiReadRequestInit = {
  next: { revalidate: 300 },
};
const COMPANY_FILTERS_API_READ: ApiReadRequestInit = {
  next: { revalidate: 3600 },
};
const COMPANY_SUGGESTIONS_API_READ: ApiReadRequestInit = {
  next: { revalidate: 60 },
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

function isOptionalNullableString(
  value: unknown,
): value is string | null | undefined {
  return value === undefined || isNullableString(value);
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

function isCompanySuggestionsResponse(value: unknown): value is CompanySuggestionsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.cd_cvm === "number" &&
        typeof item.company_name === "string" &&
        isNullableString(item.ticker_b3) &&
        typeof item.sector_slug === "string",
    )
  );
}

function isCompanyInfo(value: unknown): value is RawCompanyInfo {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    typeof value.company_name === "string" &&
    typeof value.sector_name === "string" &&
    typeof value.sector_slug === "string" &&
    isOptionalNullableString(value.read_model_updated_at) &&
    isOptionalBoolean(value.has_readable_current_data) &&
    (value.readable_years_count === undefined ||
      typeof value.readable_years_count === "number") &&
    isOptionalNullableNumber(value.latest_readable_year) &&
    isOptionalNullableString(value.read_availability_code) &&
    isOptionalNullableString(value.read_availability_message)
  );
}

function isRefreshDispatchResponse(value: unknown): value is RefreshDispatchResponse {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    (value.status === "queued" || value.status === "already_current") &&
    isNullableString(value.job_id) &&
    typeof value.accepted_at === "string" &&
    typeof value.message === "string" &&
    isNullableString(value.status_reason_code) &&
    isNullableString(value.status_reason_message) &&
    typeof value.is_retry_allowed === "boolean"
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

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNullableNumber(
  value: unknown,
): value is number | null | undefined {
  return value === undefined || isNullableNumber(value);
}

function isRefreshStatusItem(value: unknown): value is RawRefreshStatusItem {
  return (
    isRecord(value) &&
    typeof value.cd_cvm === "number" &&
    typeof value.company_name === "string" &&
    isNullableString(value.source_scope) &&
    isOptionalNullableString(value.job_id) &&
    isOptionalNullableString(value.stage) &&
    isOptionalNullableNumber(value.queue_position) &&
    isNullableString(value.last_attempt_at) &&
    isNullableString(value.last_success_at) &&
    isNullableString(value.last_status) &&
    isNullableString(value.last_error) &&
    isNullableNumber(value.last_start_year) &&
    isNullableNumber(value.last_end_year) &&
    isNullableNumber(value.last_rows_inserted) &&
    isOptionalNullableNumber(value.progress_current) &&
    isOptionalNullableNumber(value.progress_total) &&
    isOptionalNullableString(value.progress_message) &&
    isOptionalNullableString(value.started_at) &&
    isOptionalNullableString(value.heartbeat_at) &&
    isOptionalNullableString(value.finished_at) &&
    isNullableString(value.updated_at) &&
    isOptionalNullableString(value.read_model_updated_at) &&
    isOptionalNullableNumber(value.estimated_progress_pct) &&
    isOptionalNullableNumber(value.estimated_eta_seconds) &&
    isOptionalNullableNumber(value.estimated_total_seconds) &&
    isOptionalNullableNumber(value.elapsed_seconds) &&
    isOptionalNullableString(value.estimated_completion_at) &&
    isOptionalNullableString(value.estimate_confidence) &&
    isOptionalNullableString(value.tracking_state) &&
    isOptionalNullableString(value.progress_mode) &&
    isOptionalBoolean(value.is_retry_allowed) &&
    isOptionalNullableString(value.status_reason_code) &&
    isOptionalNullableString(value.status_reason_message) &&
    isOptionalBoolean(value.has_readable_current_data) &&
    (value.readable_years_count === undefined ||
      typeof value.readable_years_count === "number") &&
    isOptionalNullableNumber(value.latest_readable_year) &&
    isOptionalNullableString(value.latest_attempt_outcome) &&
    isOptionalNullableString(value.latest_attempt_reason_code) &&
    isOptionalNullableString(value.latest_attempt_reason_message) &&
    isOptionalBoolean(value.latest_attempt_retryable) &&
    isOptionalNullableString(value.read_availability_code) &&
    isOptionalNullableString(value.read_availability_message) &&
    isOptionalNullableString(value.freshness_summary_code) &&
    isOptionalNullableString(value.freshness_summary_message) &&
    isOptionalNullableString(value.freshness_summary_severity) &&
    isOptionalNullableString(value.source_label)
  );
}

function isRefreshStatusList(value: unknown): value is RawRefreshStatusItem[] {
  return Array.isArray(value) && value.every((item) => isRefreshStatusItem(item));
}

function normalizeRefreshStatusItem(
  item: RawRefreshStatusItem,
): RefreshStatusItem {
  return {
    ...item,
    job_id: item.job_id ?? null,
    stage: item.stage ?? null,
    queue_position: item.queue_position ?? null,
    progress_current: item.progress_current ?? null,
    progress_total: item.progress_total ?? null,
    progress_message: item.progress_message ?? null,
    started_at: item.started_at ?? null,
    heartbeat_at: item.heartbeat_at ?? null,
    finished_at: item.finished_at ?? null,
    read_model_updated_at: item.read_model_updated_at ?? null,
    estimated_progress_pct: item.estimated_progress_pct ?? null,
    estimated_eta_seconds: item.estimated_eta_seconds ?? null,
    estimated_total_seconds: item.estimated_total_seconds ?? null,
    elapsed_seconds: item.elapsed_seconds ?? null,
    estimated_completion_at: item.estimated_completion_at ?? null,
    estimate_confidence: item.estimate_confidence ?? null,
    tracking_state: item.tracking_state ?? null,
    progress_mode: item.progress_mode ?? null,
    is_retry_allowed: item.is_retry_allowed ?? false,
    status_reason_code: item.status_reason_code ?? null,
    status_reason_message: item.status_reason_message ?? null,
    has_readable_current_data: item.has_readable_current_data ?? false,
    readable_years_count: item.readable_years_count ?? 0,
    latest_readable_year: item.latest_readable_year ?? null,
    latest_attempt_outcome: item.latest_attempt_outcome ?? null,
    latest_attempt_reason_code: item.latest_attempt_reason_code ?? null,
    latest_attempt_reason_message: item.latest_attempt_reason_message ?? null,
    latest_attempt_retryable: item.latest_attempt_retryable ?? false,
    read_availability_code: item.read_availability_code ?? null,
    read_availability_message: item.read_availability_message ?? null,
    freshness_summary_code: item.freshness_summary_code ?? null,
    freshness_summary_message: item.freshness_summary_message ?? null,
    freshness_summary_severity: item.freshness_summary_severity ?? null,
    source_label: item.source_label ?? null,
  };
}

function normalizeCompanyInfo(company: RawCompanyInfo): CompanyInfo {
  return {
    ...company,
    read_model_updated_at: company.read_model_updated_at ?? null,
    has_readable_current_data: company.has_readable_current_data ?? false,
    readable_years_count: company.readable_years_count ?? 0,
    latest_readable_year: company.latest_readable_year ?? null,
    read_availability_code: company.read_availability_code ?? null,
    read_availability_message: company.read_availability_message ?? null,
  };
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
      code ?? "refresh_already_active",
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
  if (isDesktopMode()) return bridgeFetchHealth();
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
  if (isDesktopMode()) return bridgeFetchCompanies(params);
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

export async function fetchPopularesCompanies(): Promise<CompanyDirectoryPage> {
  if (isDesktopMode()) return bridgeFetchPopulares();
  return (await apiFetch<CompanyDirectoryPage>("/companies/populares", {
    request: COMPANY_POPULARES_API_READ,
    validate: isCompanyDirectoryPage,
    invalidResponseMessage: "A API retornou um formato invalido para as empresas populares.",
  })) as CompanyDirectoryPage;
}

export async function fetchEmDestaqueCompanies(): Promise<CompanyDirectoryPage> {
  if (isDesktopMode()) return bridgeFetchEmDestaque();
  return (await apiFetch<CompanyDirectoryPage>("/companies/em-destaque", {
    request: COMPANY_DESTAQUE_API_READ,
    validate: isCompanyDirectoryPage,
    invalidResponseMessage: "A API retornou um formato invalido para as empresas em destaque.",
  })) as CompanyDirectoryPage;
}

/**
 * Fire-and-forget: records a company page view for the "Em destaque" ranking.
 * Never throws — analytics must never block or break navigation.
 */
export function trackCompanyView(cdCvm: number): void {
  if (isDesktopMode()) { bridgeTrackCompanyView(cdCvm); return; }
  fetch("/api/company-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cd_cvm: cdCvm }),
    cache: "no-store",
  }).catch(() => {
    // intentionally swallowed
  });
}

export async function fetchCompanyFilters(): Promise<CompanyFiltersResponse> {
  if (isDesktopMode()) return bridgeFetchCompanyFilters();
  return (await apiFetch<CompanyFiltersResponse>(
    "/companies/filters",
    {
      request: COMPANY_FILTERS_API_READ,
      validate: isCompanyFiltersResponse,
      invalidResponseMessage: "A API retornou filtros de empresas invalidos.",
    },
  )) as CompanyFiltersResponse;
}

export async function fetchCompanySuggestions(
  q: string,
  limit = 6,
  options?: { readyOnly?: boolean },
): Promise<CompanySuggestionsResponse> {
  if (isDesktopMode()) return bridgeFetchCompanySuggestions(q, limit, options);
  return (await apiFetch<CompanySuggestionsResponse>(
    `/companies/suggestions${buildQuery({
      q,
      limit,
      ready_only: options?.readyOnly ? "1" : null,
    })}`,
    {
      request: COMPANY_SUGGESTIONS_API_READ,
      validate: isCompanySuggestionsResponse,
      invalidResponseMessage: "A API retornou sugestoes de empresas invalidas.",
    },
  )) as CompanySuggestionsResponse;
}

export async function fetchCompanySuggestionsRoute(
  q: string,
  limit = 6,
  options?: { readyOnly?: boolean },
): Promise<CompanySuggestionsResponse> {
  if (isDesktopMode()) return bridgeFetchCompanySuggestions(q, limit, options);
  return (await routeFetch<CompanySuggestionsResponse>(
    `/api/company-search${buildQuery({
      q,
      limit,
      ready_only: options?.readyOnly ? "1" : null,
    })}`,
    undefined,
    {
      validate: isCompanySuggestionsResponse,
      invalidResponseMessage:
        "A rota interna retornou sugestoes invalidas para a busca de empresas.",
    },
  )) as CompanySuggestionsResponse;
}

export async function fetchSectorDirectory(): Promise<SectorDirectory> {
  if (isDesktopMode()) return bridgeFetchSectors();
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
  if (isDesktopMode()) return bridgeFetchSectorDetail(sectorSlug, year);
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
  options?: { request?: ApiReadRequestInit },
): Promise<CompanyInfo | null> {
  if (isDesktopMode()) return bridgeFetchCompanyInfo(cdCvm);
  const company = await apiFetch<RawCompanyInfo>(`/companies/${cdCvm}`, {
    allowNotFound: true,
    request: options?.request ?? COMPANY_INFO_API_READ,
    validate: isCompanyInfo,
    invalidResponseMessage: "A API retornou um detalhe de empresa invalido.",
  });

  return company ? normalizeCompanyInfo(company) : null;
}

export async function fetchCompanyYears(
  cdCvm: number,
  options?: { request?: ApiReadRequestInit },
): Promise<number[]> {
  if (isDesktopMode()) return bridgeFetchCompanyYears(cdCvm);
  return (await apiFetch<number[]>(`/companies/${cdCvm}/years`, {
    request: options?.request ?? COMPANY_YEARS_API_READ,
    validate: isNumberArray,
    invalidResponseMessage: "A API retornou anos invalidos para a empresa.",
  })) as number[];
}

export async function fetchCompanyKpis(
  cdCvm: number,
  years: number[],
  options?: { request?: ApiReadRequestInit },
): Promise<KPIBundle> {
  if (isDesktopMode()) return bridgeFetchCompanyKpis(cdCvm, years);
  return (await apiFetch<KPIBundle>(
    `/companies/${cdCvm}/kpis${buildQuery({
      years: years.join(","),
    })}`,
    {
      request: options?.request ?? COMPANY_DATA_API_READ,
      validate: isKPIBundle,
      invalidResponseMessage: "A API retornou KPIs invalidos para a empresa.",
    },
  )) as KPIBundle;
}

export async function fetchCompanyStatement(
  cdCvm: number,
  years: number[],
  statementType: string,
  options?: { request?: ApiReadRequestInit },
): Promise<StatementMatrix> {
  if (isDesktopMode()) return bridgeFetchCompanyStatement(cdCvm, years, statementType);
  return (await apiFetch<StatementMatrix>(
    `/companies/${cdCvm}/statements${buildQuery({
      stmt: statementType,
      years: years.join(","),
    })}`,
    {
      request: options?.request ?? COMPANY_DATA_API_READ,
      validate: isStatementMatrix,
      invalidResponseMessage: "A API retornou uma demonstracao invalida para a empresa.",
    },
  )) as StatementMatrix;
}

export async function fetchRequestRefresh(
  cdCvm: number,
): Promise<RefreshDispatchResponse> {
  if (isDesktopMode()) return bridgeRequestRefresh(cdCvm);
  return (await routeFetch<RefreshDispatchResponse>(
    `/api/request-refresh/${cdCvm}`,
    {
      method: "POST",
    },
    {
      validate: isRefreshDispatchResponse,
      invalidResponseMessage:
        "A rota interna retornou um payload invalido para o enqueue on-demand.",
    },
  )) as RefreshDispatchResponse;
}

export async function fetchRefreshStatus(
  cdCvm: number,
): Promise<RefreshStatusItem[]> {
  if (isDesktopMode()) return bridgeFetchRefreshStatus(cdCvm);
  const items = (await routeFetch<RawRefreshStatusItem[]>(
    `/api/refresh-status/${cdCvm}`,
    undefined,
    {
      validate: isRefreshStatusList,
      invalidResponseMessage:
        "A rota interna retornou um status invalido para o refresh on-demand.",
    },
  )) as RawRefreshStatusItem[];

  return items.map(normalizeRefreshStatusItem);
}

export async function fetchCompanyFreshness(
  cdCvm: number,
): Promise<RefreshStatusItem | null> {
  const items = (await apiFetch<RawRefreshStatusItem[]>(
    `/refresh-status${buildQuery({ cd_cvm: cdCvm })}`,
    {
      request: UNCACHED_API_READ,
      validate: isRefreshStatusList,
      invalidResponseMessage:
        "A API retornou um status invalido para a companhia.",
    },
  )) as RawRefreshStatusItem[];

  return items[0] ? normalizeRefreshStatusItem(items[0]) : null;
}
