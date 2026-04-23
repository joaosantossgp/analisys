import type { CompanyInfo, KPIBundle, TabularDataRow } from "./api.ts";
import { formatYearsLabel, getInitials } from "./formatters.ts";

export type DashboardChartType = "bar" | "line" | "area";
export type DashboardFormatType = "brl" | "pct" | "ratio";

export type DashboardIndicatorOption = {
  id: string;
  label: string;
  category: string;
  formatType: DashboardFormatType;
  defaultChartType: DashboardChartType;
};

export type DashboardSelectedIndicator = {
  id: string;
  chartType: DashboardChartType;
};

export type DashboardKpiCard = {
  id: string;
  label: string;
  formatType: DashboardFormatType;
  value: number | null;
  delta: number | null;
  year: number | null;
};

export type DashboardSpotlightMetric = DashboardKpiCard & {
  values: number[];
};

export type DashboardChartSeriesPoint = {
  year: number;
  value: number;
};

export type DashboardTableRow = {
  id: string;
  label: string;
  category: string;
  formatType: DashboardFormatType;
  delta: number | null;
  valuesByYear: Record<number, number | null>;
};

export type CompanyDashboardModel = {
  years: number[];
  yearsLabel: string;
  indicatorOptions: DashboardIndicatorOption[];
  defaultSelectedIndicators: DashboardSelectedIndicator[];
  summaryCards: DashboardKpiCard[];
  spotlightMetrics: DashboardSpotlightMetric[];
  chartSeries: Record<string, DashboardKpiCard & { points: DashboardChartSeriesPoint[] }>;
  tableRows: DashboardTableRow[];
};

export type CompanyHeroModel = {
  initials: string;
  compareHref: string;
  sectorHref: string | null;
};

type DashboardCatalogEntry = DashboardIndicatorOption & {
  summary?: boolean;
  spotlight?: boolean;
  defaultSelected?: boolean;
};

const KPI_CATALOG: DashboardCatalogEntry[] = [
  {
    id: "RECEITA_LIQ",
    label: "Receita Liquida",
    category: "Escala",
    formatType: "brl",
    defaultChartType: "bar",
    spotlight: true,
    defaultSelected: true,
  },
  {
    id: "EBITDA",
    label: "EBITDA",
    category: "Escala",
    formatType: "brl",
    defaultChartType: "line",
    spotlight: true,
    defaultSelected: true,
  },
  {
    id: "LUCRO_LIQ",
    label: "Lucro Liquido",
    category: "Escala",
    formatType: "brl",
    defaultChartType: "area",
    spotlight: true,
    defaultSelected: true,
  },
  {
    id: "MG_BRUTA",
    label: "Margem Bruta",
    category: "Rentabilidade",
    formatType: "pct",
    defaultChartType: "line",
    summary: true,
  },
  {
    id: "MG_EBITDA",
    label: "Margem EBITDA",
    category: "Rentabilidade",
    formatType: "pct",
    defaultChartType: "line",
    summary: true,
    spotlight: true,
  },
  {
    id: "MG_EBIT",
    label: "Margem EBIT",
    category: "Rentabilidade",
    formatType: "pct",
    defaultChartType: "line",
  },
  {
    id: "MG_LIQ",
    label: "Margem Liquida",
    category: "Rentabilidade",
    formatType: "pct",
    defaultChartType: "line",
    summary: true,
  },
  {
    id: "ROE",
    label: "ROE",
    category: "Rentabilidade",
    formatType: "pct",
    defaultChartType: "line",
    summary: true,
  },
  {
    id: "ROA",
    label: "ROA",
    category: "Rentabilidade",
    formatType: "pct",
    defaultChartType: "line",
  },
  {
    id: "DIV_LIQ_EBITDA",
    label: "Divida Liquida / EBITDA",
    category: "Endividamento",
    formatType: "ratio",
    defaultChartType: "line",
  },
  {
    id: "DIV_LIQ_PL",
    label: "Divida Liquida / PL",
    category: "Endividamento",
    formatType: "ratio",
    defaultChartType: "line",
  },
  {
    id: "LIQ_CORR",
    label: "Liquidez Corrente",
    category: "Endividamento",
    formatType: "ratio",
    defaultChartType: "line",
  },
  {
    id: "COBERT_JUR",
    label: "Cobertura de Juros",
    category: "Endividamento",
    formatType: "ratio",
    defaultChartType: "line",
  },
  {
    id: "FCO_REC",
    label: "FCO / Receita",
    category: "Eficiência",
    formatType: "pct",
    defaultChartType: "line",
  },
  {
    id: "CAPEX_RECEITA",
    label: "Capex / Receita",
    category: "Eficiência",
    formatType: "pct",
    defaultChartType: "line",
  },
  {
    id: "GIRO_ATIVO",
    label: "Giro do Ativo",
    category: "Eficiência",
    formatType: "ratio",
    defaultChartType: "line",
  },
];

function isYearColumn(value: string): boolean {
  return /^\d{4}$/.test(value);
}

function toRowMap(bundle: KPIBundle): Map<string, TabularDataRow> {
  return new Map(
    (bundle.annual.rows as TabularDataRow[]).map((row) => [String(row.KPI_ID ?? ""), row]),
  );
}

function getYearColumns(bundle: KPIBundle): number[] {
  const explicitYears = bundle.annual.columns
    .filter(isYearColumn)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  if (explicitYears.length > 0) {
    return explicitYears.sort((left, right) => left - right);
  }

  return Array.from(
    new Set(bundle.years.filter((year) => Number.isInteger(year))),
  ).sort((left, right) => left - right);
}

function getNumericValue(
  row: TabularDataRow | undefined,
  year: number,
): number | null {
  if (!row) {
    return null;
  }

  const raw = row[String(year)];
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function getDeltaValue(row: TabularDataRow | undefined): number | null {
  if (!row) {
    return null;
  }

  const numeric = Number(row.DELTA_YOY);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasAnyValues(row: TabularDataRow | undefined, years: number[]): boolean {
  return years.some((year) => getNumericValue(row, year) !== null);
}

function buildChartSeries(
  entry: DashboardCatalogEntry,
  row: TabularDataRow,
  years: number[],
): DashboardKpiCard & { points: DashboardChartSeriesPoint[] } {
  const points = years.flatMap((year) => {
    const value = getNumericValue(row, year);
    if (value === null) {
      return [];
    }

    return [{ year, value }];
  });

  const latestYear = points.at(-1)?.year ?? null;
  const latestValue = latestYear === null ? null : getNumericValue(row, latestYear);

  return {
    id: entry.id,
    label: entry.label,
    formatType: entry.formatType,
    value: latestValue,
    delta: getDeltaValue(row),
    year: latestYear,
    points,
  };
}

export function buildCompanyDashboardModel(bundle: KPIBundle): CompanyDashboardModel {
  const years = getYearColumns(bundle);
  const rowMap = toRowMap(bundle);

  const availableEntries = KPI_CATALOG.filter((entry) =>
    hasAnyValues(rowMap.get(entry.id), years),
  );

  const indicatorOptions = availableEntries.map(
    ({ id, label, category, formatType, defaultChartType }) => ({
      id,
      label,
      category,
      formatType,
      defaultChartType,
    }),
  );

  const defaultSelectedIndicators = availableEntries
    .filter((entry) => entry.defaultSelected)
    .slice(0, 5)
    .map((entry) => ({ id: entry.id, chartType: entry.defaultChartType }));

  const fallbackSelections = availableEntries
    .slice(0, 3)
    .map((entry) => ({ id: entry.id, chartType: entry.defaultChartType }));

  const selectedDefaults =
    defaultSelectedIndicators.length > 0
      ? defaultSelectedIndicators
      : fallbackSelections;

  const summaryCards = availableEntries.flatMap((entry) => {
    if (!entry.summary) {
      return [];
    }

    const row = rowMap.get(entry.id);
    if (!row) {
      return [];
    }

    const series = buildChartSeries(entry, row, years);
    return [series];
  });

  const spotlightMetrics = availableEntries.flatMap((entry) => {
    if (!entry.spotlight) {
      return [];
    }

    const row = rowMap.get(entry.id);
    if (!row) {
      return [];
    }

    const series = buildChartSeries(entry, row, years);
    return [
      {
        ...series,
        values: series.points.map((point) => point.value),
      },
    ];
  });

  const chartSeries = Object.fromEntries(
    availableEntries.flatMap((entry) => {
      const row = rowMap.get(entry.id);
      if (!row) {
        return [];
      }

      const series = buildChartSeries(entry, row, years);
      if (series.points.length === 0) {
        return [];
      }

      return [[entry.id, series]];
    }),
  );

  const tableRows = availableEntries.map((entry) => {
    const row = rowMap.get(entry.id)!;

    return {
      id: entry.id,
      label: entry.label,
      category: entry.category,
      formatType: entry.formatType,
      delta: getDeltaValue(row),
      valuesByYear: Object.fromEntries(
        years.map((year) => [year, getNumericValue(row, year)]),
      ),
    };
  });

  return {
    years,
    yearsLabel: formatYearsLabel(years),
    indicatorOptions,
    defaultSelectedIndicators: selectedDefaults,
    summaryCards,
    spotlightMetrics,
    chartSeries,
    tableRows,
  };
}

export function buildCompanyHeroModel(
  company: CompanyInfo,
  selectedYears: number[],
): CompanyHeroModel {
  const compareParams = new URLSearchParams({ ids: String(company.cd_cvm) });
  if (selectedYears.length > 0) {
    compareParams.set("anos", selectedYears.join(","));
  }

  const latestSelectedYear = selectedYears[selectedYears.length - 1] ?? null;
  const sectorHref =
    company.sector_slug && latestSelectedYear
      ? `/setores/${company.sector_slug}?ano=${latestSelectedYear}`
      : company.sector_slug
        ? `/setores/${company.sector_slug}`
        : null;

  return {
    initials: getInitials(company.company_name),
    compareHref: `/comparar?${compareParams.toString()}`,
    sectorHref,
  };
}
