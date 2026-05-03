"use client";

import { useState } from "react";

import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { cn } from "@/lib/utils";

export type ChartPoint = { year: number; value: number };

export type CompanyHeroChartSeries = {
  label: string;
  points: ChartPoint[];
  formatSuffix?: string;
};

type CompanyHeroChartProps = {
  series: CompanyHeroChartSeries[];
};

const PERIODS: { id: string; label: string; years: number }[] = [
  { id: "3a", label: "3A", years: 3 },
  { id: "5a", label: "5A", years: 5 },
  { id: "all", label: "Todos", years: Infinity },
];

function fmtShort(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + "T";
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(0) + "M";
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(0) + "k";
  return sign + abs.toFixed(0);
}

function computeStats(points: ChartPoint[]) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const first = points[0]!.value;
  const last = points.at(-1)!.value;
  const n = points.length;
  const cagr = first > 0 && n > 1 ? Math.pow(last / first, 1 / (n - 1)) - 1 : null;
  return { max, min, avg, cagr };
}

function SvgBarChart({ points }: { points: ChartPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
        Dados insuficientes para o grÃ¡fico.
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 8, bottom: 28, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  const minVal = Math.min(0, Math.min(...values));
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const slot = innerW / points.length;
  const barW = Math.max(4, slot * 0.55);

  const toX = (i: number) => PAD.left + i * slot + slot / 2;
  const toY = (v: number) => PAD.top + innerH - ((v - minVal) / range) * innerH;
  const barH = (v: number) =>
    v >= 0
      ? ((v - minVal) / range) * innerH
      : Math.abs((v / range) * innerH);

  const zeroY = toY(0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        aria-hidden
        preserveAspectRatio="none"
        style={{ height: H }}
      >
        {/* Zero baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--border)"
          strokeWidth="1"
          strokeOpacity="0.5"
        />

        {/* Bars */}
        {points.map((p, i) => {
          const x = toX(i);
          const isPos = p.value >= 0;
          const bH = barH(p.value);
          const bY = isPos ? toY(p.value) : zeroY;
          return (
            <rect
              key={p.year}
              x={x - barW / 2}
              y={bY}
              width={barW}
              height={Math.max(1, bH)}
              rx={3}
              fill={
                hovered === i
                  ? "var(--primary)"
                  : "color-mix(in oklch, var(--chart-1) 75%, transparent)"
              }
              style={{ transition: "fill 120ms" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Hover tooltip */}
        {hovered !== null && points[hovered] && (
          <g>
            <rect
              x={toX(hovered) - 30}
              y={toY(points[hovered]!.value) - 30}
              width={60}
              height={22}
              rx={5}
              fill="var(--popover)"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={toX(hovered)}
              y={toY(points[hovered]!.value) - 13}
              textAnchor="middle"
              fontSize={9}
              fontFamily="monospace"
              fill="var(--foreground)"
            >
              {fmtShort(points[hovered]!.value)}
            </text>
          </g>
        )}

        {/* X-axis labels */}
        {points.map((p, i) => (
          <text
            key={p.year}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted-foreground)"
          >
            {p.year}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function CompanyHeroChart({ series }: CompanyHeroChartProps) {
  const [activeMetric, setActiveMetric] = useState(series[0]?.label ?? "");
  const [activePeriod, setActivePeriod] = useState("all");

  const currentSeries = series.find((s) => s.label === activeMetric) ?? series[0];
  const periodYears = PERIODS.find((p) => p.id === activePeriod)?.years ?? Infinity;
  const filteredPoints = (currentSeries?.points ?? []).filter((p, _, arr) => {
    const maxYear = Math.max(...arr.map((a) => a.year));
    return p.year > maxYear - periodYears;
  });

  const stats = computeStats(filteredPoints);

  const pillBase = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";

  if (series.length === 0 || !currentSeries) return null;

  return (
    <SurfaceCard tone="default" padding="lg">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {series.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActiveMetric(s.label)}
              className={cn(
                pillBase,
                s.label === activeMetric
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePeriod(p.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                p.id === activePeriod
                  ? "border-border bg-muted text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <SvgBarChart points={filteredPoints} />
      </div>

      {/* Footer stats */}
      {stats && (
        <div className="mt-4 grid grid-cols-4 divide-x divide-border/60 border-t border-border/60 pt-4">
          {[
            {
              label: "CAGR",
              value:
                stats.cagr !== null
                  ? `${stats.cagr >= 0 ? "+" : ""}${(stats.cagr * 100).toFixed(1)}%`
                  : "â€”",
            },
            { label: "MÃ©dia", value: fmtShort(stats.avg) },
            { label: "MÃ¡x", value: fmtShort(stats.max) },
            { label: "MÃ­n", value: fmtShort(stats.min) },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 first:pl-0 last:pr-0 text-center">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
