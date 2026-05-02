/**
 * desktop-bridge.ts — shim que roteia chamadas de dados para o bridge
 * Python (window.pywebview.api.*) quando rodando no modo desktop, com
 * fallback transparente para HTTP quando rodando no browser normal.
 *
 * Uso:
 *   import { isDesktopMode, bridgeCall } from '@/lib/desktop-bridge'
 *
 *   // dentro de uma função de fetch:
 *   if (isDesktopMode()) return bridgeCall('get_companies', { page: 1 })
 *   // ... fallback HTTP
 */

import type {
  CompanyDirectoryPage,
  CompanyFiltersResponse,
  CompanySuggestionsResponse,
  CompanyInfo,
  KPIBundle,
  StatementMatrix,
  SectorDirectory,
  SectorDetail,
  HealthResponse,
} from "./api";

// ---------------------------------------------------------------------------
// Declaração global do pywebview
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    pywebview?: {
      api: PywebviewApi;
    };
  }
}

interface PywebviewApi {
  ping(params?: Record<string, unknown>): Promise<{ pong: boolean; ts: number }>;
  get_companies(params: Record<string, unknown>): Promise<unknown>;
  get_company_filters(params?: Record<string, unknown>): Promise<unknown>;
  get_company_suggestions(params: Record<string, unknown>): Promise<unknown>;
  get_populares(params?: Record<string, unknown>): Promise<unknown>;
  get_em_destaque(params?: Record<string, unknown>): Promise<unknown>;
  track_company_view(params: Record<string, unknown>): Promise<unknown>;
  get_company_info(params: Record<string, unknown>): Promise<unknown>;
  get_company_years(params: Record<string, unknown>): Promise<unknown>;
  get_company_kpis(params: Record<string, unknown>): Promise<unknown>;
  get_company_statement(params: Record<string, unknown>): Promise<unknown>;
  get_sectors(params?: Record<string, unknown>): Promise<unknown>;
  get_sector_detail(params: Record<string, unknown>): Promise<unknown>;
  get_health(params?: Record<string, unknown>): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Detecção de modo
// ---------------------------------------------------------------------------

export function isDesktopMode(): boolean {
  return typeof window !== "undefined" && !!window.pywebview;
}

// ---------------------------------------------------------------------------
// Chamada ao bridge com tratamento de erro padronizado
// ---------------------------------------------------------------------------

type BridgeMethod = keyof Omit<PywebviewApi, "ping">;

class BridgeError extends Error {
  constructor(method: string, detail: string) {
    super(`[bridge:${method}] ${detail}`);
    this.name = "BridgeError";
  }
}

async function callBridge<T>(
  method: BridgeMethod,
  params: Record<string, unknown>,
): Promise<T> {
  const pywebview =
    typeof window !== "undefined" ? window.pywebview : undefined;
  const api = pywebview?.api;
  if (!api) throw new BridgeError(method, "pywebview.api indisponível");

  const fn = api[method] as (p: Record<string, unknown>) => Promise<unknown>;
  const result = await fn.call(api, params);

  if (
    result !== null &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as Record<string, unknown>).error === "string"
  ) {
    throw new BridgeError(method, (result as { error: string }).error);
  }

  return result as T;
}

// ---------------------------------------------------------------------------
// Funções de dados tipadas
// ---------------------------------------------------------------------------

export async function bridgeFetchCompanies(params: {
  search?: string;
  sector?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<CompanyDirectoryPage> {
  return callBridge<CompanyDirectoryPage>("get_companies", {
    search: params.search ?? "",
    sector_slug: params.sector ?? null,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
  });
}

export async function bridgeFetchPopulares(): Promise<CompanyDirectoryPage> {
  return callBridge<CompanyDirectoryPage>("get_populares", {});
}

export async function bridgeFetchEmDestaque(
  limit = 10,
): Promise<CompanyDirectoryPage> {
  return callBridge<CompanyDirectoryPage>("get_em_destaque", { limit });
}

export async function bridgeFetchCompanyFilters(): Promise<CompanyFiltersResponse> {
  return callBridge<CompanyFiltersResponse>("get_company_filters", {});
}

export async function bridgeFetchCompanySuggestions(
  q: string,
  limit = 6,
  options?: { readyOnly?: boolean },
): Promise<CompanySuggestionsResponse> {
  return callBridge<CompanySuggestionsResponse>("get_company_suggestions", {
    q,
    limit,
    ready_only: options?.readyOnly ?? false,
  });
}

export async function bridgeFetchCompanyInfo(
  cdCvm: number,
): Promise<CompanyInfo | null> {
  const result = await callBridge<
    (CompanyInfo & { not_found?: boolean }) | null
  >("get_company_info", { cd_cvm: cdCvm });

  if (!result || (result as { not_found?: boolean }).not_found) return null;
  return result as CompanyInfo;
}

export async function bridgeFetchCompanyYears(cdCvm: number): Promise<number[]> {
  const result = await callBridge<{ years: number[] }>("get_company_years", {
    cd_cvm: cdCvm,
  });
  return result.years ?? [];
}

export async function bridgeFetchCompanyKpis(
  cdCvm: number,
  years: number[],
): Promise<KPIBundle> {
  return callBridge<KPIBundle>("get_company_kpis", {
    cd_cvm: cdCvm,
    years: years.join(","),
  });
}

export async function bridgeFetchCompanyStatement(
  cdCvm: number,
  years: number[],
  statementType: string,
): Promise<StatementMatrix> {
  return callBridge<StatementMatrix>("get_company_statement", {
    cd_cvm: cdCvm,
    years: years.join(","),
    stmt: statementType,
  });
}

export async function bridgeFetchSectors(): Promise<SectorDirectory> {
  return callBridge<SectorDirectory>("get_sectors", {});
}

export async function bridgeFetchSectorDetail(
  sectorSlug: string,
  year?: number,
): Promise<SectorDetail | null> {
  const result = await callBridge<(SectorDetail & { not_found?: boolean }) | null>(
    "get_sector_detail",
    { sector_slug: sectorSlug, ...(year != null ? { year } : {}) },
  );
  if (!result || (result as { not_found?: boolean }).not_found) return null;
  return result as SectorDetail;
}

export async function bridgeFetchHealth(): Promise<HealthResponse> {
  return callBridge<HealthResponse>("get_health", {});
}

export function bridgeTrackCompanyView(cdCvm: number): void {
  if (!isDesktopMode()) return;
  const api = typeof window !== "undefined" ? window.pywebview?.api : undefined;
  api?.track_company_view({ cd_cvm: cdCvm }).catch(() => undefined);
}
