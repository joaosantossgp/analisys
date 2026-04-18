const RANKING_ITEMS = [
  { label: "Dívida/EBITDA", rank: null, total: null },
  { label: "ROE", rank: null, total: null },
  { label: "P/L", rank: null, total: null },
  { label: "Margem EBIT", rank: null, total: null },
];

function PeerBar({
  rank,
  total,
  label,
}: {
  rank: number | null;
  total: number | null;
  label: string;
}) {
  const pct = rank !== null && total !== null && total > 0 ? 1 - rank / total : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.8rem] text-muted-foreground">{label}</span>
        <span className="font-mono text-[0.75rem] text-muted-foreground/60 tabular-nums">
          {rank !== null && total !== null ? `${rank}º / ${total}` : "Em breve"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/40 transition-all duration-500"
          style={{ width: `${(pct * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}

export function CompanySectorRanking() {
  return (
    <div className="rounded-[1.25rem] border border-border/60 bg-card px-5 py-4">
      <p className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Ranking no setor
      </p>
      <div className="space-y-3.5">
        {RANKING_ITEMS.map((item) => (
          <PeerBar
            key={item.label}
            label={item.label}
            rank={item.rank}
            total={item.total}
          />
        ))}
      </div>
    </div>
  );
}
