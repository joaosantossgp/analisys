'use client';

import type { JSX } from 'react';

import { motion } from 'motion/react';

type TrendDirection = 'up' | 'down';

type CategoryData = {
  key: string;
  value: number;
  color: string;
};

type MetricItem = {
  id: string;
  icon: (props: { className?: string; fill?: string }) => JSX.Element;
  label: string;
  value: string;
  trend: TrendDirection;
  delay: number;
};

const CATEGORY_DATA: CategoryData[] = [
  { key: 'Brute Force', value: 100, color: '#9152EE' },
  { key: 'Web Attack', value: 80, color: '#40D3F4' },
  { key: 'Malware', value: 120, color: '#40E5D1' },
  { key: 'Phishing', value: 90, color: '#4C86FF' },
];

const MAX_CATEGORY_VALUE = Math.max(...CATEGORY_DATA.map((item) => item.value));

function DiamondAlertIcon({
  className,
  fill = '#E84045',
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
  fill = '#E84045',
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
  fill = '#40E5D1',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2.5 18 17H2L10 2.5Z" fill={fill} />
      <rect x="9.2" y="7" width="1.6" height="5.8" rx="0.8" fill="#05211D" />
      <circle cx="10" cy="14.8" r="1" fill="#05211D" />
    </svg>
  );
}

function TrendBadge({ direction }: { direction: TrendDirection }) {
  const isUp = direction === 'up';

  return (
    <span
      className={
        isUp
          ? 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(232,64,69,0.18)] text-[#F08083]'
          : 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(64,229,209,0.22)] text-[#40E5D1]'
      }
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

const METRICS: MetricItem[] = [
  {
    id: 'mttRespond',
    icon: DiamondAlertIcon,
    label: 'Mean Time to Respond',
    value: '6 Hours',
    trend: 'up',
    delay: 0,
  },
  {
    id: 'incidentResponseTime',
    icon: CircleAlertIcon,
    label: 'Incident Response Time',
    value: '4 Hours',
    trend: 'up',
    delay: 0.05,
  },
  {
    id: 'incidentEscalationRate',
    icon: TriangleAlertIcon,
    label: 'Incident Escalation Rate',
    value: '10%',
    trend: 'down',
    delay: 0.1,
  },
];

function ChartBar({ item, index }: { item: CategoryData; index: number }) {
  const width = `${(item.value / MAX_CATEGORY_VALUE) * 100}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-[#9A9AAF]">
        <span>{item.key}</span>
        <span className="font-mono text-[0.72rem]">{item.value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-[#1A1A23]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ delay: 0.08 * index, duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: item.color }}
        />
      </div>
    </motion.div>
  );
}

function IncidentSummaryCard(): JSX.Element {
  return (
    <div className="flex h-[560px] w-[375px] flex-col overflow-hidden rounded-3xl bg-white pt-4 pb-4 shadow-[11px_21px_3px_rgba(0,0,0,0.06),14px_27px_7px_rgba(0,0,0,0.10),19px_38px_14px_rgba(0,0,0,0.13),27px_54px_27px_rgba(0,0,0,0.16),39px_78px_50px_rgba(0,0,0,0.20),55px_110px_86px_rgba(0,0,0,0.26)] transition-colors duration-300 dark:bg-black">
      <h3 className="px-7 pt-6 pb-8 text-left text-3xl font-bold text-neutral-800 dark:text-white">
        Incident Report
      </h3>

      <div className="flex-grow px-6">
        <div className="rounded-[1.5rem] border border-neutral-200/80 bg-neutral-50/90 p-5 dark:border-[#1F1F29] dark:bg-[#101018]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-[#9A9AAF]">
              Threat mix
            </span>
            <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-500 dark:border-[#262631] dark:text-[#9A9AAF]">
              Placeholder demo
            </span>
          </div>
          <div className="space-y-4">
            {CATEGORY_DATA.map((item, index) => (
              <ChartBar key={item.key} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-neutral-200 px-8 pt-8 font-mono dark:divide-[#262631]">
        {METRICS.map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: metric.delay }}
            className="flex w-full items-center gap-2 pt-4 pb-4"
          >
            <div className="flex w-1/2 items-center gap-2 text-base text-neutral-500 dark:text-[#9A9AAF]">
              <metric.icon />
              <span className="truncate" title={metric.label}>
                {metric.label}
              </span>
            </div>
            <div className="flex w-1/2 items-center justify-end gap-2">
              <span className="text-xl font-semibold text-neutral-800 dark:text-white">{metric.value}</span>
              <TrendBadge direction={metric.trend} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default IncidentSummaryCard;
