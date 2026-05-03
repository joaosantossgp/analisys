import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import type { CompanyDirectoryItem } from "@/lib/api";
import { getCompanyAvailability } from "@/lib/company-discovery";
import { getSectorColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

function buildSparklinePoints(anos: number[], W = 54, H = 20): string {
  if (anos.length < 2) return "";
  const sorted = [...anos].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const rangeYears = max - min || 1;
  return sorted
    .map((year, i) => {
      const x = ((year - min) / rangeYears) * W;
      const y = H - (i / Math.max(sorted.length - 1, 1)) * (H * 0.75) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type CompanyRowProps = {
  item: CompanyDirectoryItem;
};

function getAvailabilityBadgeClassName(
  kind: ReturnType<typeof getCompanyAvailability>["kind"],
): string {
  switch (kind) {
    case "ready":
      return "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
    case "requestable":
      return "border-primary/20 bg-primary/8 text-primary/80";
    case "low_signal":
      return "border-amber-500/24 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "stalled":
      return "border-destructive/25 bg-destructive/8 text-destructive";
  }
}

export function CompanyRow({ item }: CompanyRowProps) {
  const color = getSectorColor(item.sector_name);
  const anos = item.anos_disponiveis ?? [];
  const sparkPts = buildSparklinePoints(anos);
  const initials = (item.ticker_b3 ?? item.company_name).slice(0, 2).toUpperCase();
  const availability = getCompanyAvailability(item);
  const yearsRange =
    anos.length > 0
      ? `${Math.min(...anos)}-${Math.max(...anos)}`
      : availability.yearsLabel;

  return (
    <Link
      href={`/empresas/${item.cd_cvm}`}
      className={cn(
        "group grid items-center gap-x-4 px-5 py-3 transition-colors",
        "[grid-template-columns:42px_minmax(0,1fr)_32px]",
        "sm:[grid-template-columns:42px_minmax(0,2fr)_minmax(0,1fr)_32px]",
        "lg:[grid-template-columns:42px_minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.85fr)_32px]",
        "cursor-pointer hover:bg-muted/40",
      )}
    >
      <div
        className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] font-heading text-sm font-semibold"
        style={{
          background: `color-mix(in oklch, ${color} 14%, transparent)`,
          border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
          color,
        }}
      >
        {initials}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {item.company_name}
          </span>
          {item.ticker_b3 ? (
            <span
              className="shrink-0 rounded-[0.35rem] border px-1.5 py-0.5 font-mono text-xs font-medium"
              style={{
                background: `color-mix(in oklch, ${color} 10%, transparent)`,
                borderColor: `color-mix(in oklch, ${color} 22%, transparent)`,
                color,
              }}
            >
              {item.ticker_b3}
            </span>
          ) : null}
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-[0.14em]",
              getAvailabilityBadgeClassName(availability.kind),
            )}
          >
            {availability.badge}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          CVM {item.cd_cvm}
        </p>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
          {availability.detail}
        </p>
      </div>

      <p className="hidden truncate text-sm text-muted-foreground sm:block">
        {item.sector_name ?? "--"}
      </p>

      <div className="hidden items-center gap-2 lg:flex">
        {sparkPts ? (
          <svg width={54} height={20} viewBox="0 0 54 20" aria-hidden className="shrink-0">
            <polyline
              points={sparkPts}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
          {yearsRange}
        </span>
      </div>

      <div className="hidden text-right lg:block">
        <span className="text-sm text-muted-foreground">
          {availability.summary}
        </span>
      </div>

      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
