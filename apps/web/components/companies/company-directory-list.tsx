import Link from "next/link";
import { InboxIcon } from "lucide-react";

import { CompanyCard } from "@/components/companies/company-card";
import { CompanyRow } from "@/components/companies/company-row";
import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { buttonVariants } from "@/components/ui/button";
import type { CompanyDirectoryItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type CompanyDirectoryListProps = {
  items: CompanyDirectoryItem[];
  viewMode: "rows" | "cards";
  viewRowsHref: string;
  viewCardsHref: string;
  hasActiveFilters: boolean;
  clearHref: string;
};

export function CompanyDirectoryList({
  items,
  viewMode,
  viewRowsHref,
  viewCardsHref,
  hasActiveFilters,
  clearHref,
}: CompanyDirectoryListProps) {
  const toggleBase =
    "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1.5">
        <Link
          href={viewRowsHref}
          title="Ver em linhas"
          className={cn(
            toggleBase,
            viewMode === "rows"
              ? "border-border bg-muted text-foreground"
              : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="2" width="12" height="2" rx="0.5" fill="currentColor" />
            <rect x="1" y="6" width="12" height="2" rx="0.5" fill="currentColor" />
            <rect x="1" y="10" width="12" height="2" rx="0.5" fill="currentColor" />
          </svg>
        </Link>
        <Link
          href={viewCardsHref}
          title="Ver em cards"
          className={cn(
            toggleBase,
            viewMode === "cards"
              ? "border-border bg-muted text-foreground"
              : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
          </svg>
        </Link>
      </div>

      {items.length === 0 ? (
        <SurfaceCard tone="muted" padding="hero" className="items-center text-center">
          <InboxIcon className="size-10 text-muted-foreground/50" />
          <p className="font-heading text-xl text-foreground">
            Nenhuma empresa encontrada.
          </p>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            Ajuste o termo de busca ou remova o filtro setorial para ampliar o
            diretório disponível.
          </p>
          {hasActiveFilters ? (
            <Link
              href={clearHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
            >
              Limpar filtros
            </Link>
          ) : null}
        </SurfaceCard>
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CompanyCard key={item.cd_cvm} item={item} />
          ))}
        </div>
      ) : (
        <SurfaceCard tone="default" padding="none" className="overflow-hidden">
          <div className="divide-y divide-border/45">
            {items.map((item) => (
              <CompanyRow key={item.cd_cvm} item={item} />
            ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
