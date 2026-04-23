import type { CompanyDirectoryItem } from "@/lib/api";

export type CompanyAvailability = {
  kind: "ready" | "requestable";
  badge: string;
  summary: string;
  detail: string;
  yearsLabel: string;
};

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
): CompanyAvailability {
  const anos = item.anos_disponiveis ?? [];
  const hasReadableHistory =
    item.has_financial_data !== false && anos.length > 0;

  if (hasReadableHistory) {
    return {
      kind: "ready",
      badge: "Pronta agora",
      summary: "Historico anual liberado",
      detail: "KPIs, demonstracoes e Excel disponiveis agora.",
      yearsLabel: `${anos.length} ano${anos.length === 1 ? "" : "s"} locais`,
    };
  }

  return {
    kind: "requestable",
    badge: "Solicitavel",
    summary: "Ainda sem historico local",
    detail: "Abra a empresa para disparar a primeira carga on-demand.",
    yearsLabel: "Sem anos locais",
  };
}

export function prioritizeDiscoveryCompanies(
  items: CompanyDirectoryItem[],
  limit = items.length,
): CompanyDirectoryItem[] {
  return [...items]
    .sort((left, right) => {
      const leftReady =
        left.has_financial_data !== false && (left.anos_disponiveis?.length ?? 0) > 0;
      const rightReady =
        right.has_financial_data !== false && (right.anos_disponiveis?.length ?? 0) > 0;

      if (leftReady !== rightReady) {
        return leftReady ? -1 : 1;
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
    .filter(
      (item) =>
        item.has_financial_data !== false && (item.anos_disponiveis?.length ?? 0) > 0,
    )
    .slice(0, limit);
}
