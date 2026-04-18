import { SurfaceCard } from "@/components/shared/design-system-recipes";
import type { KPIBundle, TabularDataRow } from "@/lib/api";
import { formatKpiDelta, formatKpiValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const KPI_CARDS = [
  { id: "MG_BRUTA", label: "Margem Bruta", formatType: "pct" },
  { id: "MG_EBITDA", label: "Margem EBITDA", formatType: "pct" },
  { id: "ROE", label: "ROE", formatType: "pct" },
  { id: "MG_LIQ", label: "Margem Líquida", formatType: "pct" },
] as const;

type CompanyKpiRowProps = {
  bundle: KPIBundle;
};

export function CompanyKpiRow({ bundle }: CompanyKpiRowProps) {
  const annualRows = bundle.annual.rows as TabularDataRow[];
  const yearColumns = bundle.annual.columns
    .filter((c) => /^\d{4}$/.test(c))
    .sort((a, b) => Number(a) - Number(b));
  const lastYear = yearColumns.at(-1);
  const kpiMap = new Map(annualRows.map((row) => [String(row.KPI_ID), row]));

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {KPI_CARDS.map((kpi) => {
        const row = kpiMap.get(kpi.id);
        const currentValue =
          row && lastYear ? Number(row[lastYear] ?? NaN) : null;
        const deltaValue =
          row?.DELTA_YOY === null || row?.DELTA_YOY === undefined
            ? null
            : Number(row.DELTA_YOY);
        const isPositive = deltaValue !== null && deltaValue >= 0;

        return (
          <SurfaceCard key={kpi.id} tone="subtle" padding="md">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <span className="text-[0.65rem] text-muted-foreground/60 tabular-nums">
                  {lastYear ?? "—"}
                </span>
              </div>
              <p className="font-heading text-2xl tracking-[-0.04em] text-foreground">
                {formatKpiValue(currentValue, kpi.formatType)}
              </p>
              {deltaValue !== null ? (
                <p
                  className={cn(
                    "text-xs",
                    isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive",
                  )}
                >
                  {formatKpiDelta(deltaValue, kpi.formatType)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50">sem delta</p>
              )}
            </div>
          </SurfaceCard>
        );
      })}
    </div>
  );
}
