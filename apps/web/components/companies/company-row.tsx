import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import type { CompanyDirectoryItem } from "@/lib/api";
import { getSectorColor } from "@/lib/constants";
import { formatYearsLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function buildSparklinePoints(anos: number[]): string {
  if (anos.length === 0) return "";
  const sorted = [...anos].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const rangeYears = max - min || 1;
  const W = 48;
  const H = 16;

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

export function CompanyRow({ item }: CompanyRowProps) {
  const sectorColor = getSectorColor(item.sector_name);
  const hasData = item.has_financial_data !== false;
  const sparkPoints = buildSparklinePoints(item.anos_disponiveis);

  return (
    <Link
      href={hasData ? `/empresas/${item.cd_cvm}` : "#"}
      aria-disabled={!hasData}
      className={cn(
        "group flex h-[54px] items-center gap-4 px-5 transition-colors",
        hasData
          ? "hover:bg-muted/40 cursor-pointer"
          : "pointer-events-none opacity-50",
      )}
    >
      <span
        className="flex h-7 min-w-[3.25rem] items-center justify-center rounded-full px-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white"
        style={{ backgroundColor: sectorColor }}
      >
        {item.ticker_b3 ?? "—"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.company_name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.sector_name}
        </p>
      </div>

      {sparkPoints ? (
        <svg
          width={48}
          height={16}
          viewBox="0 0 48 16"
          className="hidden shrink-0 text-primary sm:block"
          aria-hidden
        >
          <polyline
            points={sparkPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      <span className="hidden w-20 text-right text-xs text-muted-foreground sm:block">
        {formatYearsLabel(item.anos_disponiveis)}
      </span>

      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
