import { CompanyFreshnessCard } from "@/components/company/company-freshness-card";
import { CompanyHeroChart } from "@/components/company/company-hero-chart";
import { CompanyKpiRow } from "@/components/company/company-kpi-row";
import { CompanySectorRanking } from "@/components/company/company-sector-ranking";
import { SparklineChip } from "@/components/shared/sparkline-chip";
import {
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KPIBundle, TabularDataRow } from "@/lib/api";
import { formatKpiDelta, formatKpiValue } from "@/lib/formatters";

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
      <div className="flex flex-col gap-5 lg:col-span-8">
        <CompanyKpiRow bundle={bundle} />

        {chartSeries.length > 0 ? (
          <CompanyHeroChart series={chartSeries} />
        ) : null}

        <section className="space-y-4">
          <SectionHeading
            eyebrow="Matriz anual de KPIs"
            title="Leitura compacta por indicador"
            titleAs="h3"
          />
          <SurfaceCard tone="default" padding="none" className="overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/35">
                <TableRow>
                  <TableHead className="px-5">Indicador</TableHead>
                  <TableHead>Categoria</TableHead>
                  {yearColumns.map((year) => (
                    <TableHead key={year}>{year}</TableHead>
                  ))}
                  <TableHead>Delta YoY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annualRows
                  .filter((row) => !Boolean(row.IS_PLACEHOLDER))
                  .map((row) => {
                    const formatType = String(row.FORMAT_TYPE ?? "ratio");
                    return (
                      <TableRow key={String(row.KPI_ID)}>
                        <TableCell className="px-5 font-medium text-foreground">
                          {String(row.KPI_NOME)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {String(row.CATEGORIA)}
                        </TableCell>
                        {yearColumns.map((year) => (
                          <TableCell key={year}>
                            {formatKpiValue(
                              row[year] === null || row[year] === undefined
                                ? null
                                : Number(row[year]),
                              formatType,
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-muted-foreground">
                          {formatKpiDelta(
                            row.DELTA_YOY === null || row.DELTA_YOY === undefined
                              ? null
                              : Number(row.DELTA_YOY),
                            formatType,
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </SurfaceCard>
        </section>
      </div>

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
