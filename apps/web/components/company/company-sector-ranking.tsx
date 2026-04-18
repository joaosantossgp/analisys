import { SurfaceCard } from "@/components/shared/design-system-recipes";

const RANKING_ITEMS = [
  { label: "Dívida/EBITDA" },
  { label: "ROE" },
  { label: "P/L" },
  { label: "Margem EBIT" },
];

export function CompanySectorRanking() {
  return (
    <SurfaceCard tone="subtle" padding="md">
      <p className="eyebrow mb-3 text-muted-foreground">Ranking no setor</p>
      <div className="space-y-3">
        {RANKING_ITEMS.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground/60">Em breve</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-0 rounded-full bg-primary/30" />
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
