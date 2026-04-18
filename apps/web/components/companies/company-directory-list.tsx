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
  hasActiveFilters: boolean;
  clearHref: string;
};

export function CompanyDirectoryList({
  items,
  viewMode,
  hasActiveFilters,
  clearHref,
}: CompanyDirectoryListProps) {
  if (items.length === 0) {
    return (
      <SurfaceCard tone="muted" padding="hero" className="items-center text-center">
        <InboxIcon className="size-10 text-muted-foreground/50" />
        <p className="font-heading text-xl text-foreground">Nenhuma empresa encontrada.</p>
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">
          Ajuste o termo de busca ou remova o filtro setorial para ampliar o diretório
          disponível.
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
    );
  }

  if (viewMode === "cards") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <CompanyCard key={item.cd_cvm} item={item} />
        ))}
      </div>
    );
  }

  return (
    <SurfaceCard tone="default" padding="none" className="overflow-hidden">
      <div className="divide-y divide-border/45">
        {items.map((item) => (
          <CompanyRow key={item.cd_cvm} item={item} />
        ))}
      </div>
    </SurfaceCard>
  );
}
