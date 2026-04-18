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
          <div
            key={kpi.id}
            className="rounded-[1.25rem] border border-border/60 bg-card px-5 py-4"
          >
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-2 font-heading text-[1.75rem] font-medium tracking-[-0.04em] text-foreground leading-none">
              {formatKpiValue(currentValue, kpi.formatType)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              {deltaValue !== null ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[0.72rem] font-medium",
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatKpiDelta(deltaValue, kpi.formatType)}
                </span>
              ) : (
                <span className="text-[0.72rem] text-muted-foreground/40">sem delta</span>
              )}
              <span className="text-[0.68rem] tabular-nums text-muted-foreground/50">
                {lastYear ?? "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
