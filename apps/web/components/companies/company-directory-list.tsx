import Link from "next/link";
import { InboxIcon } from "lucide-react";

import { CompanyCard } from "@/components/companies/company-card";
import { CompanyRow } from "@/components/companies/company-row";
import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { buttonVariants } from "@/components/ui/button";
import type { CompanyDirectoryItem, CompanySuggestionItem } from "@/lib/api";
import { getSectorNameFromSlug } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CompanyDirectoryListProps = {
  items: CompanyDirectoryItem[];
  viewMode: "rows" | "cards";
  hasActiveFilters: boolean;
  clearHref: string;
  fallbackSuggestions?: CompanySuggestionItem[];
  fallbackSuggestionsError?: string | null;
  searchTerm?: string;
  showCatalogFallback?: boolean;
};

export function CompanyDirectoryList({
  items,
  viewMode,
  hasActiveFilters,
  clearHref,
  fallbackSuggestions = [],
  fallbackSuggestionsError = null,
  searchTerm = "",
  showCatalogFallback = false,
}: CompanyDirectoryListProps) {
  if (items.length === 0) {
    const hasCatalogFallback =
      showCatalogFallback &&
      searchTerm.trim().length >= 2 &&
      fallbackSuggestions.length > 0;

    return (
      <SurfaceCard tone="muted" padding="hero" className="items-center text-center">
        <InboxIcon className="size-10 text-muted-foreground/50" />
        <p className="font-heading text-xl text-foreground">
          {hasCatalogFallback
            ? "Nenhuma empresa encontrada na base local."
            : "Nenhuma empresa encontrada."}
        </p>
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">
          {hasCatalogFallback
            ? "O diretorio local ainda nao tem dados processados para essa busca, mas o catalogo CVM abaixo permite abrir a pagina e solicitar dados on-demand."
            : "Ajuste o termo de busca ou remova o filtro setorial para ampliar o diretorio disponivel."}
        </p>

        {fallbackSuggestionsError ? (
          <div className="max-w-lg rounded-[1rem] border border-border/70 bg-background/85 px-4 py-3 text-left text-sm leading-6 text-muted-foreground">
            O catalogo CVM tambem oscilou agora: {fallbackSuggestionsError}
          </div>
        ) : null}

        {hasCatalogFallback ? (
          <div className="grid w-full max-w-2xl gap-3 text-left">
            {fallbackSuggestions.map((item) => (
              <Link
                key={item.cd_cvm}
                href={`/empresas/${item.cd_cvm}`}
                className="rounded-[1.25rem] border border-border/65 bg-card px-4 py-3 transition-colors hover:border-primary/25 hover:bg-background"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">{item.company_name}</p>
                      <span className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.14em] text-primary/80">
                        Solicitar dados
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getSectorNameFromSlug(item.sector_slug) ?? "Setor nao informado"}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Sem historico local neste filtro. A pagina da empresa libera o pedido on-demand.
                    </p>
                  </div>
                  <div className="text-right">
                    {item.ticker_b3 ? (
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {item.ticker_b3}
                      </p>
                    ) : null}
                    <p className="font-mono text-sm text-foreground">CVM {item.cd_cvm}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Abrir e solicitar</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

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
