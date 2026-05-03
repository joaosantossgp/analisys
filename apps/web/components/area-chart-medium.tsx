'use client';

import { useState } from 'react';
import type { JSX } from 'react';

import CountUp from 'react-countup';
import { motion } from 'motion/react';

type TrendDirection = 'up' | 'down';

type SeriesPoint = {
  date: Date;
  value: number;
};

type ChartSeries = {
  key: string;
  color: string;
  points: SeriesPoint[];
};

type IncidentStat = {
  id: string;
  title: string;
  count: number;
  countFrom: number;
  comparisonText: string;
  percentage: number;
  trend: TrendDirection;
};

type DetailedMetric = {
  id: string;
  icon: (props: { className?: string; fill?: string }) => JSX.Element;
  label: string;
  tooltip: string;
  value: string;
  trend: TrendDirection;
  trendColor: string;
  delay: number;
};

type PeriodKey = keyof typeof CHART_DATA_BY_PERIOD;

const TIME_PERIOD_OPTIONS = [
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'last-90-days', label: 'Last 90 Days' },
] as const;

const SERIES_META = [
  { key: 'DLP', color: 'var(--chart-3)' },
  { key: 'Threat Intel', color: 'var(--chart-5)' },
  { key: 'SysLog', color: 'var(--chart-4)' },
] as const;

const CHART_DATA_BY_PERIOD = {
  'last-7-days': {
    stepDays: 1,
    values: {
      DLP: [42, 47, 45, 50, 55, 53, 58],
      'Threat Intel': [24, 21, 26, 28, 30, 29, 31],
      SysLog: [30, 34, 32, 36, 39, 37, 41],
    },
  },
  'last-30-days': {
    stepDays: 3,
    values: {
      DLP: [36, 38, 41, 45, 47, 50, 54, 52, 56, 60],
      'Threat Intel': [19, 21, 20, 24, 26, 25, 28, 27, 30, 32],
      SysLog: [22, 26, 29, 28, 31, 33, 35, 34, 37, 39],
    },
  },
  'last-90-days': {
    stepDays: 7,
    values: {
      DLP: [28, 31, 35, 33, 37, 42, 46, 45, 49, 53, 58, 61],
      'Threat Intel': [16, 18, 17, 19, 21, 23, 24, 26, 27, 29, 31, 33],
      SysLog: [18, 22, 24, 27, 26, 29, 31, 33, 35, 34, 37, 40],
    },
  },
} as const;

const INCIDENT_STATS: IncidentStat[] = [
  {
    id: 'critical',
    title: 'Critical Incidents',
    count: 321,
    countFrom: 293,
    comparisonText: 'Compared to 293 last week',
    percentage: 12,
    trend: 'up',
  },
  {
    id: 'total',
    title: 'Total Incidents',
    count: 1120,
    countFrom: 1060,
    comparisonText: 'Compared to 1.06k last week',
    percentage: 4,
    trend: 'down',
  },
];

function DiamondAlertIcon({
  className,
  fill = 'var(--destructive)',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4" y="4" width="12" height="12" rx="3" transform="rotate(45 10 10)" fill={fill} />
      <rect x="9.2" y="5.25" width="1.6" height="6.8" rx="0.8" fill="white" />
      <circle cx="10" cy="14.2" r="1" fill="white" />
    </svg>
  );
}

function CircleAlertIcon({
  className,
  fill = 'var(--destructive)',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" fill={fill} />
      <rect x="9.2" y="5" width="1.6" height="7" rx="0.8" fill="white" />
      <circle cx="10" cy="14.2" r="1" fill="white" />
    </svg>
  );
}

function TriangleAlertIcon({
  className,
  fill = 'var(--chart-1)',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2.5 18 17H2L10 2.5Z" fill={fill} />
      <rect x="9.2" y="7" width="1.6" height="5.8" rx="0.8" fill="var(--background)" />
      <circle cx="10" cy="14.8" r="1" fill="var(--background)" />
    </svg>
  );
}

function TrendBadge({
  direction,
  color,
}: {
  direction: TrendDirection;
  color: string;
}) {
  const isUp = direction === 'up';

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full"
      style={{
        backgroundColor: isUp ? 'rgba(232,64,69,0.18)' : 'rgba(64,229,209,0.22)',
        color,
      }}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {isUp ? (
          <path d="M7 2.5 11 6.5 9.9 7.6 7.75 5.45V11.5h-1.5V5.45L4.1 7.6 3 6.5l4-4Z" fill="currentColor" />
        ) : (
          <path d="m7 11.5-4-4 1.1-1.1 2.15 2.15V2.5h1.5v6.05L9.9 6.4 11 7.5l-4 4Z" fill="currentColor" />
        )}
      </svg>
    </span>
  );
}

const DETAILED_METRICS: DetailedMetric[] = [
  {
    id: 'mttd',
    icon: DiamondAlertIcon,
    label: 'Mean Time to Respond',
    tooltip: 'Mean Time to Respond',
    value: '6 Hours',
    trend: 'up',
    trendColor: 'var(--destructive)',
    delay: 0,
  },
  {
    id: 'irt',
    icon: CircleAlertIcon,
    label: 'Incident Response Time',
    tooltip: 'Incident Response Time',
    value: '4 Hours',
    trend: 'up',
    trendColor: 'var(--destructive)',
    delay: 0.05,
  },
  {
    id: 'ier',
    icon: TriangleAlertIcon,
    label: 'Incident Escalation Rate',
    tooltip: 'Incident Escalation Rate',
    value: '10%',
    trend: 'down',
    trendColor: 'var(--chart-1)',
    delay: 0.1,
  },
];

function buildPeriodSeries(period: PeriodKey): ChartSeries[] {
  const preset = CHART_DATA_BY_PERIOD[period];
  const longestSeriesLength = Math.max(...Object.values(preset.values).map((values) => values.length));
  const now = new Date();

  return SERIES_META.map((series) => {
    const values = preset.values[series.key];

    return {
      key: series.key,
      color: series.color,
      points: values.map((value, index) => {
        const offset = (longestSeriesLength - 1 - index) * preset.stepDays;
        const date = new Date(now);
        date.setDate(now.getDate() - offset);

        return { date, value };
      }),
    };
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

function buildAreaPath(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildPath(points);
  const lastPoint = points[points.length - 1]!;
  const firstPoint = points[0]!;

  return `${linePath} L ${lastPoint.x.toFixed(1)} ${baselineY.toFixed(1)} L ${firstPoint.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

function IncidentAreaChart({ period }: { period: PeriodKey }) {
  const series = buildPeriodSeries(period);
  const firstSeries = series[0];

  if (!firstSeries) {
    return null;
  }

  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 30, left: 18 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const maxValue = Math.max(...allValues);
  const minValue = 0;
  const range = Math.max(maxValue - minValue, 1);
  const step = firstSeries.points.length > 1 ? innerWidth / (firstSeries.points.length - 1) : innerWidth;
  const baselineY = padding.top + innerHeight;

  const toX = (index: number) => padding.left + index * step;
  const toY = (value: number) => padding.top + innerHeight - ((value - minValue) / range) * innerHeight;

  const gridValues = Array.from({ length: 4 }, (_, index) => minValue + ((maxValue - minValue) / 3) * index);

  return (
    <motion.div
      key={period}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="h-[280px] px-2"
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          {series.map((item, index) => (
            <linearGradient
              key={item.key}
              id={`incident-series-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={item.color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {gridValues.map((value) => {
          const y = toY(value);
          return (
            <line
              key={value}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgba(126,126,143,0.32)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          );
        })}

        {series.map((item, index) => {
          const points = item.points.map((point, pointIndex) => ({
            x: toX(pointIndex),
            y: toY(point.value),
          }));

          return (
            <g key={item.key}>
              <path d={buildAreaPath(points, baselineY)} fill={`url(#incident-series-${index})`} />
              <path d={buildPath(points)} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" />
              {points.map((point, pointIndex) => (
                <circle
                  key={`${item.key}-${pointIndex}`}
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  fill={item.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          );
        })}

        {firstSeries.points.map((point, index) => (
          <text
            key={point.date.toISOString()}
            x={toX(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {formatShortDate(point.date)}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}

const AdvancedIncidentReportCard = () => {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<PeriodKey>('last-7-days');

  return (
    <div className="flex min-h-[714px] w-full max-w-2xl flex-col justify-between overflow-hidden rounded-3xl bg-white pt-4 pb-4 shadow-[11px_21px_3px_rgba(0,0,0,0.06),14px_27px_7px_rgba(0,0,0,0.10),19px_38px_14px_rgba(0,0,0,0.13),27px_54px_27px_rgba(0,0,0,0.16),39px_78px_50px_rgba(0,0,0,0.20),55px_110px_86px_rgba(0,0,0,0.26)] transition-colors duration-300 dark:bg-black">
      <div className="flex items-center justify-between p-7 pt-6 pb-8">
        <h3 className="text-left text-3xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">
          Incident Report
        </h3>
        <select
          value={selectedTimePeriod}
          onChange={(event) => setSelectedTimePeriod(event.target.value as PeriodKey)}
          className="rounded-md bg-gray-100 p-3 pt-2 pb-2 text-gray-800 outline-none transition-colors duration-300 focus:ring-2 focus:ring-blue-500 dark:bg-[var(--muted)] dark:text-white"
          aria-label="Select time period for incident report"
        >
          {TIME_PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex w-full gap-8 px-8">
        {SERIES_META.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <div className="h-4 w-4" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-500 transition-colors duration-300 dark:text-gray-400">{item.key}</span>
          </div>
        ))}
      </div>

      <IncidentAreaChart period={selectedTimePeriod} />

      <div className="flex w-full flex-col justify-between gap-4 px-8 pt-8 pb-2 sm:flex-row sm:gap-8">
        {INCIDENT_STATS.map((stat) => {
          const trendColor = stat.trend === 'up' ? 'var(--destructive)' : 'var(--chart-1)';

          return (
            <div key={stat.id} className="flex w-full flex-col gap-2 sm:w-1/2">
              <span className="text-xl text-gray-800 transition-colors duration-300 dark:text-gray-200">
                {stat.title}
              </span>
              <div className="flex items-center gap-2">
                <CountUp
                  className="font-mono text-4xl font-semibold text-gray-900 transition-colors duration-300 dark:text-white"
                  start={stat.countFrom}
                  end={stat.count}
                  duration={2.5}
                />
                <div
                  className="flex items-center gap-1 rounded-full p-1 pl-2 pr-2"
                  style={{
                    backgroundColor: stat.trend === 'up' ? 'rgba(232,64,69,0.18)' : 'rgba(64,229,209,0.22)',
                    color: trendColor,
                  }}
                >
                  <TrendBadge direction={stat.trend} color={trendColor} />
                  <span className="text-sm font-medium">{stat.percentage}%</span>
                </div>
              </div>
              <span className="text-sm text-gray-500 transition-colors duration-300 dark:text-gray-400">
                {stat.comparisonText}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col divide-y divide-gray-200 px-8 font-mono transition-colors duration-300 dark:divide-[var(--muted)]">
        {DETAILED_METRICS.map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: metric.delay }}
            className="flex w-full items-center gap-2 py-4"
          >
            <div className="flex w-1/2 items-center gap-2 text-base text-gray-500 transition-colors duration-300 dark:text-gray-400">
              <metric.icon fill={metric.trend === 'down' ? 'var(--chart-1)' : 'var(--destructive)'} />
              <span className="truncate" title={metric.tooltip}>
                {metric.label}
              </span>
            </div>
            <div className="flex w-1/2 items-center justify-end gap-2">
              <span className="text-xl font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                {metric.value}
              </span>
              <TrendBadge direction={metric.trend} color={metric.trendColor} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdvancedIncidentReportCard;
