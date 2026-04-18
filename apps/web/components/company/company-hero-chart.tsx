"use client";

import { useState } from "react";

import {
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { cn } from "@/lib/utils";

type ChartPoint = { year: number; value: number };

type HeroChartSeries = {
  label: string;
  points: ChartPoint[];
  formatSuffix?: string;
};

type CompanyHeroChartProps = {
  series: HeroChartSeries[];
};

const PERIODS: { id: string; label: string; years: number }[] = [
  { id: "3a", label: "3A", years: 3 },
  { id: "5a", label: "5A", years: 5 },
  { id: "all", label: "Todos", years: Infinity },
];

function SvgAreaChart({ points }: { points: ChartPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
        Dados insuficientes para o gráfico.
      </div>
    );
  }

  const W = 600;
  const H = 140;
  const PAD = { top: 12, right: 8, bottom: 20, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    PAD.left + (i / (points.length - 1)) * innerW;
  const toY = (v: number) =>
    PAD.top + innerH - ((v - minVal) / range) * innerH;

  const linePts = points
    .map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`)
    .join(" ");

  const areaPath = [
    `M ${toX(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)}`,
    points
      .map((p, i) => `L ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
      .join(" "),
    `L ${toX(points.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full text-primary"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="hero-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#hero-chart-grad)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <text
          key={p.year}
          x={toX(i).toFixed(1)}
          y={H - 4}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
          fontSize={10}
        >
          {p.year}
        </text>
      ))}
    </svg>
  );
}

export function CompanyHeroChart({ series }: CompanyHeroChartProps) {
  const [activeMetric, setActiveMetric] = useState(series[0]?.label ?? "");
  const [activePeriod, setActivePeriod] = useState("all");

  const currentSeries = series.find((s) => s.label === activeMetric) ?? series[0];
  const periodYears =
    PERIODS.find((p) => p.id === activePeriod)?.years ?? Infinity;
  const filteredPoints = (currentSeries?.points ?? []).filter((p, _, arr) => {
    const maxYear = Math.max(...arr.map((a) => a.year));
    return p.year > maxYear - periodYears;
  });

  const pillBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors";

  if (series.length === 0 || !currentSeries) {
    return null;
  }

  return (
    <SurfaceCard tone="default" padding="lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title={activeMetric}
          titleAs="h2"
          eyebrow="Histórico"
          bodyClassName="gap-0"
        />
        <div className="flex flex-wrap gap-2">
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
          <div className="mx-1 w-px bg-border/60" aria-hidden />
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePeriod(p.id)}
              className={cn(
                pillBase,
                p.id === activePeriod
                  ? "border-border bg-muted text-foreground"
                  : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <SvgAreaChart points={filteredPoints} />
      </div>
    </SurfaceCard>
  );
}
