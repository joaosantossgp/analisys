import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import type { CompanyDirectoryItem } from "@/lib/api";
import { getSectorColor } from "@/lib/constants";
import { formatYearsLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type CompanyCardProps = {
  item: CompanyDirectoryItem;
};

export function CompanyCard({ item }: CompanyCardProps) {
  const sectorColor = getSectorColor(item.sector_name);
  const hasData = item.has_financial_data !== false;

  return (
    <Link
      href={hasData ? `/empresas/${item.cd_cvm}` : "#"}
      aria-disabled={!hasData}
      className={cn(
        "group flex flex-col justify-between gap-4 overflow-hidden rounded-xl border border-border/60 bg-card px-5 py-4 transition-colors",
        hasData ? "hover:border-border hover:bg-muted/30" : "pointer-events-none opacity-50",
      )}
      style={{ borderLeftColor: sectorColor, borderLeftWidth: 3 }}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="flex h-6 items-center rounded-full px-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white"
            style={{ backgroundColor: sectorColor }}
          >
            {item.ticker_b3 ?? "—"}
          </span>
          <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        <p className="font-heading text-base font-medium text-foreground leading-tight line-clamp-2">
          {item.company_name}
        </p>
        <p className="text-xs text-muted-foreground">{item.sector_name}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        {formatYearsLabel(item.anos_disponiveis)}
      </p>
    </Link>
  );
}
