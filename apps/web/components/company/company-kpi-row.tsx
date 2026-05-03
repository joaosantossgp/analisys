import type { DashboardKpiCard } from "@/lib/company-dashboard";
import { formatKpiDelta, formatKpiValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type CompanyKpiRowProps = {
  cards: DashboardKpiCard[];
};

export function CompanyKpiRow({ cards }: CompanyKpiRowProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => {
        const isPositive = card.delta !== null && card.delta >= 0;

        return (
          <div
            key={card.id}
            className="rounded-[1.25rem] border border-border/60 bg-card px-5 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 font-heading text-[1.75rem] font-medium tracking-[-0.04em] text-foreground leading-none">
              {formatKpiValue(card.value, card.formatType)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              {card.delta !== null ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatKpiDelta(card.delta, card.formatType)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/40">sem delta</span>
              )}
              <span className="text-xs tabular-nums text-muted-foreground/50">
                {card.year ?? "Ã¢â‚¬â€"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
