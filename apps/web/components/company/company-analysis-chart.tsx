"use client";

import { useMemo, useState } from "react";

import type {
  CompanyDashboardModel,
  DashboardFormatType,
  DashboardSelectedIndicator,
} from "@/lib/company-dashboard";

type CompanyAnalysisChartProps = {
  chartSeries: CompanyDashboardModel["chartSeries"];
  selectedIndicators: DashboardSelectedIndicator[];
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type AxisStats = {
  min: number;
  max: number;
};

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMetricValue(value: number, formatType: DashboardFormatType): string {
  if (formatType === "pct") {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (formatType === "ratio") {
    return `${value.toFixed(2)}x`;
  }

  return formatCompactCurrency(value);
}

function formatAxisValue(value: number, formatType: DashboardFormatType | "mixed"): string {
  if (formatType === "pct") {
    return `${(value * 100).toFixed(0)}%`;
  }

  if (formatType === "ratio") {
    return `${value.toFixed(1)}x`;
  }

  if (formatType === "mixed") {
    return value.toFixed(1);
  }

  return formatCompactCurrency(value);
}

function buildAxisStats(values: number[]): AxisStats {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  const rawMin = Math.min(...values, 0);
  const rawMax = Math.max(...values, 0);

  if (rawMin === rawMax) {
    return {
      min: rawMin === 0 ? 0 : rawMin * 0.9,
      max: rawMax === 0 ? 1 : rawMax * 1.1,
    };
  }

  const padding = (rawMax - rawMin) * 0.08;
  return {
    min: rawMin - padding,
    max: rawMax + padding,
  };
}

function buildTicks(stats: AxisStats, count = 5): number[] {
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    return stats.min + (stats.max - stats.min) * ratio;
  });
}

export function CompanyAnalysisChart({
  chartSeries,
  selectedIndicators,
}: CompanyAnalysisChartProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const activeSeries = useMemo(
    () =>
      selectedIndicators.flatMap((selection, index) => {
        const series = chartSeries[selection.id];
        if (!series || series.points.length === 0) {
          return [];
        }

        return [
          {
            ...series,
            chartType: selection.chartType,
            color: CHART_COLORS[index % CHART_COLORS.length],
          },
        ];
      }),
    [chartSeries, selectedIndicators],
  );

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          activeSeries.flatMap((series) => series.points.map((point) => point.year)),
        ),
      ).sort((left, right) => left - right),
    [activeSeries],
  );

  if (activeSeries.length === 0 || years.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-muted/16 text-sm text-muted-foreground">
        Selecione indicadores com historico anual para visualizar o grafico.
      </div>
    );
  }

  const valueSeries = activeSeries.filter((series) => series.formatType === "brl");
  const relativeSeries = activeSeries.filter((series) => series.formatType !== "brl");
  const valueStats = buildAxisStats(valueSeries.flatMap((series) => series.points.map((point) => point.value)));
  const relativeStats = buildAxisStats(
    relativeSeries.flatMap((series) => series.points.map((point) => point.value)),
  );
  const rightAxisMode: DashboardFormatType | "mixed" =
    relativeSeries.length === 0
      ? "mixed"
      : relativeSeries.every((series) => series.formatType === "pct")
        ? "pct"
        : relativeSeries.every((series) => series.formatType === "ratio")
          ? "ratio"
          : "mixed";

  const W = 760;
  const H = 320;
  const PAD = { top: 28, right: 72, bottom: 44, left: 82 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(years.length, 1);
  const barSeriesCount = activeSeries.filter((series) => series.chartType === "bar").length;
  const barWidth = barSeriesCount > 0 ? Math.min((slot * 0.62) / barSeriesCount, 34) : 24;

  function getAxisForFormat(formatType: DashboardFormatType): AxisStats {
    return formatType === "brl" ? valueStats : relativeStats;
  }

  function toX(index: number): number {
    return PAD.left + index * slot + slot / 2;
  }

  function toY(value: number, formatType: DashboardFormatType): number {
    const axis = getAxisForFormat(formatType);
    return PAD.top + innerH - ((value - axis.min) / (axis.max - axis.min || 1)) * innerH;
  }

  function getBaseline(formatType: DashboardFormatType): number {
    return toY(0, formatType);
  }

  function buildLinePath(
    points: Array<{ year: number; value: number }>,
    formatType: DashboardFormatType,
  ): string {
    return points
      .map((point, index) => {
        const yearIndex = years.indexOf(point.year);
        const x = toX(yearIndex);
        const y = toY(point.value, formatType);
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  function buildAreaPath(
    points: Array<{ year: number; value: number }>,
    formatType: DashboardFormatType,
  ): string {
    const linePath = buildLinePath(points, formatType);
    const firstYearIndex = years.indexOf(points[0]!.year);
    const lastYearIndex = years.indexOf(points.at(-1)!.year);
    const baseline = getBaseline(formatType);
    return `${linePath} L${toX(lastYearIndex)},${baseline} L${toX(firstYearIndex)},${baseline} Z`;
  }

  const hoveredEntries =
    hoveredYear === null
      ? []
      : activeSeries.flatMap((series) => {
          const point = series.points.find((item) => item.year === hoveredYear);
          if (!point) {
            return [];
          }

          return [
            {
              color: series.color,
              label: series.label,
              formatType: series.formatType,
              value: point.value,
            },
          ];
        });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-[1.35rem] border border-border/60 bg-background/72 px-4 py-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[680px] w-full" style={{ height: H }}>
          {buildTicks(valueStats).map((tick) => (
            <line
              key={`value-grid-${tick}`}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={toY(tick, "brl")}
              y2={toY(tick, "brl")}
              stroke="var(--border)"
              strokeOpacity="0.45"
              strokeDasharray={Math.abs(tick) < 0.00001 ? "0" : "4 4"}
            />
          ))}

          {valueSeries.length > 0
            ? buildTicks(valueStats).map((tick) => (
                <text
                  key={`value-tick-${tick}`}
                  x={PAD.left - 10}
                  y={toY(tick, "brl")}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--muted-foreground)"
                >
                  {formatAxisValue(tick, "brl")}
                </text>
              ))
            : null}

          {relativeSeries.length > 0
            ? buildTicks(relativeStats).map((tick) => (
                <text
                  key={`relative-tick-${tick}`}
                  x={W - PAD.right + 10}
                  y={toY(tick, relativeSeries[0]?.formatType ?? "pct")}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--muted-foreground)"
                >
                  {formatAxisValue(tick, rightAxisMode)}
                </text>
              ))
            : null}

          {years.map((year, index) => (
            <g key={year}>
              <line
                x1={toX(index)}
                x2={toX(index)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--border)"
                strokeOpacity={hoveredYear === year ? 0.5 : 0}
              />
              <rect
                x={toX(index) - slot / 2}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoveredYear(year)}
                onMouseLeave={() => setHoveredYear(null)}
              />
              <text
                x={toX(index)}
                y={H - 12}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {year}
              </text>
            </g>
          ))}

          {activeSeries.map((series, seriesIndex) => {
            if (series.chartType === "bar") {
              const barIndex = activeSeries
                .filter((item) => item.chartType === "bar")
                .findIndex((item) => item.id === series.id);

              return (
                <g key={series.id}>
                  {series.points.map((point) => {
                    const yearIndex = years.indexOf(point.year);
                    const xCenter = toX(yearIndex);
                    const baseline = getBaseline(series.formatType);
                    const y = toY(point.value, series.formatType);
                    const height = Math.abs(baseline - y);
                    const x =
                      xCenter -
                      (barSeriesCount * barWidth) / 2 +
                      barWidth / 2 +
                      barIndex * barWidth;

                    return (
                      <rect
                        key={`${series.id}-${point.year}`}
                        x={x}
                        y={Math.min(y, baseline)}
                        width={barWidth}
                        height={Math.max(height, 1)}
                        rx={5}
                        fill={series.color}
                        fillOpacity={hoveredYear === point.year ? 1 : 0.78}
                      />
                    );
                  })}
                </g>
              );
            }

            const path = buildLinePath(series.points, series.formatType);
            const areaPath =
              series.chartType === "area"
                ? buildAreaPath(series.points, series.formatType)
                : null;

            return (
              <g key={series.id}>
                {areaPath ? (
                  <path d={areaPath} fill={series.color} fillOpacity={0.14} />
                ) : null}
                <path
                  d={path}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {series.points.map((point) => {
                  const yearIndex = years.indexOf(point.year);
                  return (
                    <circle
                      key={`${series.id}-${point.year}`}
                      cx={toX(yearIndex)}
                      cy={toY(point.value, series.formatType)}
                      r={hoveredYear === point.year ? 5 : 3}
                      fill={series.color}
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {activeSeries.map((series) => (
          <div
            key={series.id}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/18 px-3 py-1.5 text-xs"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <span className="font-medium text-foreground">{series.label}</span>
          </div>
        ))}
      </div>

      {hoveredYear !== null && hoveredEntries.length > 0 ? (
        <div className="rounded-[1.25rem] border border-border/60 bg-muted/18 px-4 py-3">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Ano em foco
          </p>
          <div className="mt-2 flex flex-wrap items-start gap-3">
            <p className="font-heading text-2xl tracking-[-0.03em] text-foreground">
              {hoveredYear}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hoveredEntries.map((entry) => (
                <div
                  key={entry.label}
                  className="min-w-[11rem] rounded-[1rem] border border-border/50 bg-background/75 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMetricValue(entry.value, entry.formatType)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
