import Link from "next/link";

import type { CompanyDirectoryItem } from "@/lib/api";
import { getCompanyAvailability } from "@/lib/company-discovery";
import { getSectorColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

function buildSparklinePoints(anos: number[], W = 240, H = 36): string {
  if (anos.length < 2) return "";
  const sorted = [...anos].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const rangeYears = max - min || 1;
  return sorted
    .map((year, i) => {
      const x = ((year - min) / rangeYears) * W;
      const y = H - (i / Math.max(sorted.length - 1, 1)) * (H * 0.75) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type CompanyCardProps = {
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

export function CompanyCard({ item }: CompanyCardProps) {
  const color = getSectorColor(item.sector_name);
  const anos = item.anos_disponiveis ?? [];
  const sparkPts = buildSparklinePoints(anos);
  const initials = (item.ticker_b3 ?? item.company_name).slice(0, 2).toUpperCase();
  const availability = getCompanyAvailability(item);
  const yearsRange =
    anos.length > 0 ? `${Math.min(...anos)}-${Math.max(...anos)}` : availability.yearsLabel;

  return (
    <Link
      href={`/empresas/${item.cd_cvm}`}
      className={cn(
        "group flex flex-col gap-4 overflow-hidden rounded-[1.25rem] border border-border/60 bg-card p-5 transition-all duration-200",
        availability.kind === "ready"
          ? "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(16,30,24,0.2)]"
          : "hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] font-heading text-sm font-semibold"
            style={{
              background: `color-mix(in oklch, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
              color,
            }}
          >
            {initials}
          </div>
          {item.ticker_b3 ? (
            <span
              className="rounded-[0.35rem] border px-1.5 py-0.5 font-mono text-[0.7rem] font-medium"
              style={{
                background: `color-mix(in oklch, ${color} 10%, transparent)`,
                borderColor: `color-mix(in oklch, ${color} 22%, transparent)`,
                color,
              }}
            >
              {item.ticker_b3}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.14em]",
            getAvailabilityBadgeClassName(availability.kind),
          )}
        >
          {availability.badge}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden
        >
          <path
            d="M3 11L11 3M11 3H5M11 3V9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-heading text-[0.95rem] font-medium leading-tight text-foreground">
          {item.company_name}
        </p>
        {item.sector_name ? (
          <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{item.sector_name}</p>
        ) : null}
        <p className="mt-2 text-[0.78rem] leading-6 text-muted-foreground">
          {availability.detail}
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60 pt-3">
        {(
          [
            { label: "Estado", value: availability.summary },
            { label: "Historico", value: yearsRange },
            {
              label: "Entrada",
              value: availability.actionLabel,
            },
          ] as const
        ).map(({ label, value }) => (
          <div key={label} className="px-2 first:pl-0 last:pr-0">
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 text-[0.78rem] font-medium text-foreground/78">
              {value}
            </p>
          </div>
        ))}
      </div>

      {sparkPts ? (
        <div className="overflow-hidden rounded-[0.5rem]">
          <svg
            width="100%"
            height={36}
            viewBox="0 0 240 36"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id={`card-spark-${item.cd_cvm}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              points={sparkPts}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : null}
    </Link>
  );
}
