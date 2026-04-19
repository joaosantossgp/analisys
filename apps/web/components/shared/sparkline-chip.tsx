import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { formatKpiDelta } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function buildPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.8) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const firstPt = pts[0]!.split(",");
  const lastPt = pts[pts.length - 1]!.split(",");
  return [
    `M ${firstPt[0]} ${firstPt[1]}`,
    pts.slice(1).map((p) => `L ${p}`).join(" "),
    `L ${lastPt[0]} ${h} L ${firstPt[0]} ${h} Z`,
  ].join(" ");
}

type SparklineChipProps = {
  label: string;
  value: string | null;
  delta: number | null;
  formatType?: string;
  values?: number[];
};

export function SparklineChip({
  label,
  value,
  delta,
  formatType = "brl",
  values = [],
}: SparklineChipProps) {
  const showSparkline = values.length >= 3;
  const isPositive = delta !== null && delta >= 0;
  const W = 80;
  const H = 24;
  const path = showSparkline ? buildPath(values, W, H) : "";

  return (
    <SurfaceCard tone="subtle" padding="md">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-sm font-medium text-foreground">
            {value ?? "—"}
          </p>
          {delta !== null ? (
            <p
              className={cn(
                "text-xs",
                isPositive ? "text-green-600 dark:text-green-400" : "text-destructive",
              )}
            >
              {formatKpiDelta(delta, formatType)}
            </p>
          ) : null}
        </div>

        {showSparkline ? (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="shrink-0 text-primary"
            aria-hidden
          >
            <defs>
              <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={path} fill={`url(#sg-${label})`} />
            <polyline
              points={values
                .map((v, i) => {
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const x = (i / (values.length - 1)) * W;
                  const y = H - ((v - min) / range) * (H * 0.8) - 2;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
