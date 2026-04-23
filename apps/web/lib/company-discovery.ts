import type { CompanyDirectoryItem } from "@/lib/api";

export type CompanyDiscoveryStateKind =
  | "ready"
  | "requestable"
  | "stalled"
  | "low_signal";

export type CompanyAvailability = {
  kind: CompanyDiscoveryStateKind;
  badge: string;
  summary: string;
  detail: string;
  yearsLabel: string;
  actionLabel: string;
  compareEligible: boolean;
};

type CompanyAvailabilityOptions = {
  referenceYear?: number;
};

const MIN_READY_YEARS = 2;
const MIN_READY_ROWS = 24;
const STALE_YEAR_LAG = 2;

const DISCOVERY_ORDER: Record<CompanyDiscoveryStateKind, number> = {
  ready: 0,
  requestable: 1,
  low_signal: 2,
  stalled: 3,
};

function getReferenceYear(options?: CompanyAvailabilityOptions): number {
  return options?.referenceYear ?? new Date().getFullYear();
}

function getSortedYears(item: CompanyDirectoryItem): number[] {
  return [...(item.anos_disponiveis ?? [])].sort((left, right) => left - right);
}

function getYearsLabel(years: number[]): string {
  if (years.length === 0) {
    return "Sem anos locais";
  }

  if (years.length === 1) {
    return `${years[0]} local`;
  }

  return `${years[0]}-${years[years.length - 1]}`;
}

function compareCoverageRank(
  left: number | null,
  right: number | null,
): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}

export function getCompanyAvailability(
  item: CompanyDirectoryItem,
  options?: CompanyAvailabilityOptions,
): CompanyAvailability {
  const anos = getSortedYears(item);
  const yearsLabel = getYearsLabel(anos);
  const latestYear = anos[anos.length - 1] ?? null;
  const hasReadableHistory = item.has_financial_data !== false && anos.length > 0;

  if (!hasReadableHistory) {
    return {
      kind: "requestable",
      badge: "Solicitar dados",
      summary: "Carga on-demand",
      detail:
        "Ainda sem historico local. Abra a pagina para solicitar a primeira carga.",
      yearsLabel,
      actionLabel: "Abrir e solicitar",
      compareEligible: false,
    };
  }

  const referenceYear = getReferenceYear(options);
  const isStalled = latestYear !== null && latestYear < referenceYear - STALE_YEAR_LAG;
  const isLowSignal =
    anos.length < MIN_READY_YEARS ||
    (item.total_rows ?? 0) < MIN_READY_ROWS;

  if (isStalled) {
    return {
      kind: "stalled",
      badge: "Estagnada",
      summary: "Historico antigo",
      detail:
        "Existe leitura local, mas o ano mais recente parece defasado para analise atual.",
      yearsLabel,
      actionLabel: "Revisar historico",
      compareEligible: false,
    };
  }

  if (isLowSignal) {
    return {
      kind: "low_signal",
      badge: "Baixo sinal",
      summary: "Leitura limitada",
      detail:
        "Ha dados locais, mas a cobertura ainda e curta para comparacoes fortes.",
      yearsLabel,
      actionLabel: "Conferir dados",
      compareEligible: false,
    };
  }

  return {
    kind: "ready",
    badge: "Pronta agora",
    summary: "Analise completa",
    detail: "KPIs, demonstracoes e Excel disponiveis agora.",
    yearsLabel,
    actionLabel: "Analisar agora",
    compareEligible: true,
  };
}

export function prioritizeDiscoveryCompanies(
  items: CompanyDirectoryItem[],
  limit = items.length,
): CompanyDirectoryItem[] {
  return [...items]
    .sort((left, right) => {
      const leftAvailability = getCompanyAvailability(left);
      const rightAvailability = getCompanyAvailability(right);
      const stateDiff =
        DISCOVERY_ORDER[leftAvailability.kind] - DISCOVERY_ORDER[rightAvailability.kind];

      if (stateDiff !== 0) {
        return stateDiff;
      }

      const yearsDiff =
        (right.anos_disponiveis?.length ?? 0) - (left.anos_disponiveis?.length ?? 0);
      if (yearsDiff !== 0) {
        return yearsDiff;
      }

      const rankDiff = compareCoverageRank(left.coverage_rank, right.coverage_rank);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      const rowDiff = (right.total_rows ?? 0) - (left.total_rows ?? 0);
      if (rowDiff !== 0) {
        return rowDiff;
      }

      return left.company_name.localeCompare(right.company_name, "pt-BR");
    })
    .slice(0, limit);
}

export function selectReadyCompareCompanies(
  items: CompanyDirectoryItem[],
  limit = 6,
): CompanyDirectoryItem[] {
  return prioritizeDiscoveryCompanies(items, items.length)
    .filter((item) => getCompanyAvailability(item).compareEligible)
    .slice(0, limit);
}
