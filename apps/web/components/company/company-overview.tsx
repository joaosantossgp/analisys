import { CompanyFreshnessCard } from "@/components/company/company-freshness-card";
import { CompanyHeroChart } from "@/components/company/company-hero-chart";
import { CompanyKpiRow } from "@/components/company/company-kpi-row";
import { CompanySectorRanking } from "@/components/company/company-sector-ranking";
import { SparklineChip } from "@/components/shared/sparkline-chip";
import { SectionHeading } from "@/components/shared/design-system-recipes";
import type { KPIBundle, TabularDataRow } from "@/lib/api";
import { formatKpiDelta, formatKpiValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const CHART_KPIS = [
  { id: "RECEITA_LIQ", label: "Receita" },
  { id: "EBITDA", label: "EBITDA" },
  { id: "LUCRO_LIQ", label: "Lucro" },
] as const;

const SPARKLINE_KPIS = [
  { id: "RECEITA_LIQ", label: "Receita Líquida", formatType: "brl" },
  { id: "EBITDA", label: "EBITDA", formatType: "brl" },
  { id: "MG_EBITDA", label: "Margem EBITDA", formatType: "pct" },
] as const;

const KPI_GROUPS = [
  {
    label: "Rentabilidade",
    kpis: [
      { id: "MG_BRUTA", label: "Mg. Bruta", formatType: "pct" },
      { id: "MG_EBITDA", label: "Mg. EBITDA", formatType: "pct" },
      { id: "MG_EBIT", label: "Mg. EBIT", formatType: "pct" },
      { id: "MG_LIQ", label: "Mg. Líquida", formatType: "pct" },
      { id: "ROE", label: "ROE", formatType: "pct" },
      { id: "ROA", label: "ROA", formatType: "pct" },
    ],
  },
  {
    label: "Endividamento",
    kpis: [
      { id: "DIV_LIQ_EBITDA", label: "Dív/EBITDA", formatType: "ratio" },
      { id: "DIV_LIQ_PL", label: "Dív Líq/PL", formatType: "ratio" },
      { id: "LIQ_CORR", label: "Liq. Corrente", formatType: "ratio" },
      { id: "COBERT_JUR", label: "Cob. Juros", formatType: "ratio" },
    ],
  },
  {
    label: "Eficiência",
    kpis: [
      { id: "FCO_REC", label: "FCO/Receita", formatType: "pct" },
      { id: "CAPEX_RECEITA", label: "Capex/Rec", formatType: "pct" },
      { id: "GIRO_ATIVO", label: "Giro Ativo", formatType: "ratio" },
    ],
  },
] as const;

function isYearColumn(value: string): boolean {
  return /^\d{4}$/.test(value);
}

type CompanyOverviewProps = {
  bundle: KPIBundle;
  cdCvm: number;
};

export function CompanyOverview({ bundle, cdCvm }: CompanyOverviewProps) {
  const annualRows = bundle.annual.rows as TabularDataRow[];
  const yearColumns = bundle.annual.columns
    .filter(isYearColumn)
    .sort((a, b) => Number(a) - Number(b));
  const lastYear = yearColumns.at(-1);
  const kpiMap = new Map(annualRows.map((row) => [String(row.KPI_ID), row]));

  const chartSeries = CHART_KPIS.flatMap((kpi) => {
    const row = kpiMap.get(kpi.id);
    if (!row) return [];
    const points = yearColumns.flatMap((year) => {
      const val = row[year];
      if (val === null || val === undefined) return [];
      const num = Number(val);
      if (isNaN(num)) return [];
      return [{ year: Number(year), value: num }];
    });
    if (points.length < 2) return [];
    return [{ label: kpi.label, points }];
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      {/* Main column */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        <CompanyKpiRow bundle={bundle} />

        {chartSeries.length > 0 ? <CompanyHeroChart series={chartSeries} /> : null}

        {/* 3-group KPI tiles */}
        <section className="space-y-5">
          <SectionHeading
            eyebrow="Indicadores"
            title="Por categoria"
            titleAs="h3"
          />
          <div className="space-y-5">
            {KPI_GROUPS.map((group) => {
              const visibleKpis = group.kpis.filter((kpi) => kpiMap.has(kpi.id));
              if (visibleKpis.length === 0) return null;

              return (
                <div key={group.label}>
                  <p className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visibleKpis.map((kpi) => {
                      const row = kpiMap.get(kpi.id);
                      const value =
                        row && lastYear ? Number(row[lastYear] ?? NaN) : null;
                      const delta =
                        row?.DELTA_YOY === null || row?.DELTA_YOY === undefined
                          ? null
                          : Number(row.DELTA_YOY);
                      const isPos = delta !== null && delta >= 0;

                      return (
                        <div
                          key={kpi.id}
                          className="rounded-[1rem] border border-border/60 bg-card px-4 py-3"
                        >
                          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {kpi.label}
                          </p>
                          <p className="mt-1 font-heading text-[1.25rem] font-medium tracking-[-0.03em] text-foreground leading-none">
                            {formatKpiValue(value, kpi.formatType)}
                          </p>
                          {delta !== null && (
                            <p
                              className={cn(
                                "mt-1 text-[0.7rem] font-medium",
                                isPos
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive",
                              )}
                            >
                              {isPos ? "+" : ""}
                              {formatKpiDelta(delta, kpi.formatType)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {SPARKLINE_KPIS.map((kpi) => {
          const row = kpiMap.get(kpi.id);
          const values = yearColumns.flatMap((year) => {
            const val = row?.[year];
            if (val === null || val === undefined) return [];
            const num = Number(val);
            return isNaN(num) ? [] : [num];
          });
          const currentValue = row && lastYear ? Number(row[lastYear] ?? NaN) : null;
          const deltaValue =
            row?.DELTA_YOY === null || row?.DELTA_YOY === undefined
              ? null
              : Number(row.DELTA_YOY);

          return (
            <SparklineChip
              key={kpi.id}
              label={kpi.label}
              value={formatKpiValue(currentValue, kpi.formatType)}
              delta={deltaValue}
              formatType={kpi.formatType}
              values={values}
            />
          );
        })}

        <CompanyFreshnessCard cdCvm={cdCvm} />
        <CompanySectorRanking />
      </div>
    </div>
  );
}
