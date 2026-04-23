import Link from "next/link";

import { CompanyDirectoryFilters } from "@/components/companies/company-directory-filters";
import { CompanyDirectoryList } from "@/components/companies/company-directory-list";
import { DirectoryPagination } from "@/components/companies/directory-pagination";
import {
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  type CompaniesDirectoryQueryState,
} from "@/lib/companies-directory-query";
import { formatCompactInteger } from "@/lib/formatters";
import type { CompaniesPageData } from "@/lib/companies-page-data";
import { mergeSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type CompaniesDirectoryPageContentProps = Pick<
  CompaniesDirectoryQueryState,
  "page" | "pageSize" | "search" | "sector" | "viewMode"
> & {
  data: CompaniesPageData;
};

const DISCOVERY_LEGEND = [
  {
    label: "Pronta agora",
    description: "Leitura anual suficiente para KPIs, demonstracoes e Excel.",
    className: "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Solicitar dados",
    description: "Sem historico local; abra a pagina para pedir on-demand.",
    className: "border-primary/20 bg-primary/8 text-primary/80",
  },
  {
    label: "Baixo sinal",
    description: "Tem dados locais, mas cobertura curta para comparacao forte.",
    className: "border-amber-500/24 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Estagnada",
    description: "Historico local existe, mas parece defasado.",
    className: "border-destructive/25 bg-destructive/8 text-destructive",
  },
] as const;

export function CompaniesDirectoryPageContent({
  page: currentPage,
  pageSize,
  search: currentSearch,
  sector: currentSector,
  viewMode,
  data,
}: CompaniesDirectoryPageContentProps) {
  const retryParams = new URLSearchParams();
  if (currentSearch) {
    retryParams.set("busca", currentSearch);
  }
  if (currentSector) {
    retryParams.set("setor", currentSector);
  }
  if (currentPage > 1) {
    retryParams.set("pagina", String(currentPage));
  }
  if (viewMode === "cards") {
    retryParams.set("view", "cards");
  }
  const retryQuery = retryParams.toString();
  const retryHref = retryQuery ? `/empresas?${retryQuery}` : "/empresas";

  if (!data.directory) {
    return (
      <PageShell density="relaxed" className="max-w-4xl">
        <SurfaceCard tone="hero" padding="hero" className="space-y-6">
          <SectionHeading
            eyebrow="Empresas"
            title="Diretorio temporariamente indisponivel"
            titleAs="h1"
            description="A listagem de empresas nao respondeu agora. O fluxo de busca e navegacao pode ser retomado assim que a API voltar a responder."
          />
          <Alert className="rounded-[1.75rem] border border-destructive/25 bg-destructive/6 px-5 py-5 text-left">
            <AlertTitle>Falha controlada da listagem</AlertTitle>
            <AlertDescription>
              {data.directoryError ??
                "Nao foi possivel carregar o diretorio de empresas agora. Tente novamente em instantes."}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Link
              href={retryHref}
              className={cn(buttonVariants({ size: "lg" }), "rounded-full px-5")}
            >
              Tentar novamente
            </Link>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full px-5",
              )}
            >
              Voltar para a home
            </Link>
          </div>
        </SurfaceCard>
      </PageShell>
    );
  }

  const { directory, directoryError, filters, filtersError } = data;
  const currentParamsStr = mergeSearchParams("", {
    busca: currentSearch || null,
    setor: currentSector,
    pagina: currentPage > 1 ? currentPage : null,
  });
  const viewRowsQuery = mergeSearchParams(currentParamsStr, { view: null });
  const viewRowsHref = viewRowsQuery ? `/empresas?${viewRowsQuery}` : "/empresas";
  const viewCardsQuery = mergeSearchParams(currentParamsStr, { view: "cards" });
  const viewCardsHref = viewCardsQuery ? `/empresas?${viewCardsQuery}` : "/empresas?view=cards";
  const clearHref = viewMode === "cards" ? "/empresas?view=cards" : "/empresas";
  const toggleBase =
    "flex size-8 items-center justify-center rounded-lg border transition-colors text-sm";

  return (
    <PageShell density="default" className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-muted-foreground">
            Diretorio / CVM
          </p>
          <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-tight tracking-[-0.04em] text-foreground">
            Todas as companhias abertas
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-muted-foreground">
            {formatCompactInteger(directory.pagination.total_items)} empresas
            {currentSearch ? ` / "${currentSearch}"` : ""}
            {currentSector ? ` / ${currentSector}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
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
      </div>

      {directoryError ? (
        <Alert className="rounded-[1.75rem] border border-border/70 bg-background/85 px-5 py-4">
          <AlertTitle>Atualizacao parcial da listagem</AlertTitle>
          <AlertDescription>{directoryError}</AlertDescription>
        </Alert>
      ) : null}

      {filtersError ? (
        <Alert className="rounded-[1.75rem] border border-border/70 bg-background/85 px-5 py-4">
          <AlertTitle>Filtro setorial indisponivel</AlertTitle>
          <AlertDescription>
            {filtersError} A busca livre e a paginacao continuam disponiveis.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {DISCOVERY_LEGEND.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.1rem] border border-border/60 bg-background/80 px-4 py-3"
          >
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.14em]",
                item.className,
              )}
            >
              {item.label}
            </span>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <CompanyDirectoryFilters
        key={`${currentSearch}|${currentSector ?? "all"}|${filtersError ? "filters-down" : "filters-up"}`}
        currentSearch={currentSearch}
        currentSector={currentSector}
        sectors={filters?.sectors ?? []}
        sectorFilterUnavailable={Boolean(filtersError)}
      />

      <div className="space-y-6">
        <CompanyDirectoryList
          items={directory.items}
          viewMode={viewMode}
          hasActiveFilters={Boolean(currentSearch || currentSector)}
          clearHref={clearHref}
          fallbackSuggestions={data.fallbackSuggestions?.items ?? []}
          fallbackSuggestionsError={data.fallbackSuggestionsError}
          searchTerm={currentSearch}
          showCatalogFallback={!currentSector}
        />

        <DirectoryPagination
          currentPage={directory.pagination.page}
          totalPages={directory.pagination.total_pages}
          totalItems={directory.pagination.total_items}
          pageSize={pageSize}
          hasNext={directory.pagination.has_next}
          hasPrevious={directory.pagination.has_previous}
          currentSearch={currentSearch}
          currentSector={Boolean(filtersError) ? null : currentSector}
        />
      </div>
    </PageShell>
  );
}

export function CompaniesDirectoryLoadingState() {
  return (
    <PageShell density="default" className="space-y-8">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-muted/70" />
        <div className="h-10 w-72 max-w-full rounded-full bg-muted/70" />
        <div className="h-4 w-80 max-w-full rounded-full bg-muted/55" />
      </div>

      <SurfaceCard tone="subtle" padding="lg" className="space-y-4">
        <div className="h-10 rounded-[1rem] bg-muted/55" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-28 rounded-[1.5rem] bg-muted/45" />
          <div className="h-28 rounded-[1.5rem] bg-muted/45" />
          <div className="h-28 rounded-[1.5rem] bg-muted/45" />
        </div>
      </SurfaceCard>
    </PageShell>
  );
}
