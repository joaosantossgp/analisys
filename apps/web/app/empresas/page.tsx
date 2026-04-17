import Link from "next/link";
import type { Metadata } from "next";

import { CompanyDirectoryFilters } from "@/components/companies/company-directory-filters";
import { CompanyDirectoryList } from "@/components/companies/company-directory-list";
import { DirectoryPagination } from "@/components/companies/directory-pagination";
import {
  PageShell,
  SurfaceCard,
  SectionHeading,
} from "@/components/shared/design-system-recipes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { formatCompactInteger } from "@/lib/formatters";
import { loadCompaniesPageData } from "@/lib/companies-page-data";
import { coercePositiveInt, getFirstParam, mergeSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Empresas",
  description:
    "Diretorio publico e paginado de empresas com dados financeiros ja processados na base CVM Analytics.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type EmpresasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmpresasPage({ searchParams }: EmpresasPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentSearch = getFirstParam(resolvedSearchParams.busca) ?? "";
  const currentSector = getFirstParam(resolvedSearchParams.setor) ?? null;
  const currentPage = coercePositiveInt(
    getFirstParam(resolvedSearchParams.pagina),
    1,
  );
  const rawView = getFirstParam(resolvedSearchParams.view);
  const viewMode: "rows" | "cards" = rawView === "cards" ? "cards" : "rows";

  const retryParams = new URLSearchParams();
  if (currentSearch) retryParams.set("busca", currentSearch);
  if (currentSector) retryParams.set("setor", currentSector);
  if (currentPage > 1) retryParams.set("pagina", String(currentPage));
  const retryQuery = retryParams.toString();
  const retryHref = retryQuery ? `/empresas?${retryQuery}` : "/empresas";

  const { directory, filters, directoryError, filtersError } =
    await loadCompaniesPageData({
      search: currentSearch,
      sector: currentSector,
      page: currentPage,
      pageSize: PAGE_SIZE,
    });

  if (!directory) {
    return (
      <PageShell density="relaxed" className="max-w-4xl">
        <SurfaceCard tone="hero" padding="hero" className="space-y-6">
          <SectionHeading
            eyebrow="Empresas"
            title="Diretório temporariamente indisponível"
            titleAs="h1"
            description="A listagem de empresas não respondeu agora. O fluxo de busca e navegação pode ser retomado assim que a API voltar a responder."
          />
          <Alert className="rounded-[1.75rem] border border-destructive/25 bg-destructive/6 px-5 py-5 text-left">
            <AlertTitle>Falha controlada da listagem</AlertTitle>
            <AlertDescription>
              {directoryError ??
                "Não foi possível carregar o diretório de empresas agora. Tente novamente em instantes."}
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

  const currentParamsStr = mergeSearchParams("", {
    busca: currentSearch || null,
    setor: currentSector,
    pagina: currentPage > 1 ? currentPage : null,
  });
  const viewRowsHref = mergeSearchParams(currentParamsStr, { view: null })
    ? `/empresas?${mergeSearchParams(currentParamsStr, { view: null })}`
    : "/empresas";
  const viewCardsHref = `/empresas?${mergeSearchParams(currentParamsStr, { view: "cards" }) || "view=cards"}`;
  const clearHref = viewMode === "cards" ? "/empresas?view=cards" : "/empresas";

  return (
    <PageShell density="default">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl text-foreground">
          Diretório de empresas
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatCompactInteger(directory.pagination.total_items)} resultados
          {currentSearch ? ` para "${currentSearch}"` : ""}
          {currentSector ? ` · ${currentSector}` : ""}
        </p>
      </div>

      {filtersError ? (
        <Alert className="rounded-[1.75rem] border border-border/70 bg-background/85 px-5 py-4">
          <AlertTitle>Filtro setorial indisponível</AlertTitle>
          <AlertDescription>
            {filtersError} A busca livre e a paginação continuam disponíveis.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <CompanyDirectoryFilters
              currentSearch={currentSearch}
              currentSector={currentSector}
              sectors={filters?.sectors ?? []}
              sectorFilterUnavailable={Boolean(filtersError)}
            />
          </div>
        </aside>

        <div className="space-y-6">
          <CompanyDirectoryList
            items={directory.items}
            viewMode={viewMode}
            viewRowsHref={viewRowsHref}
            viewCardsHref={viewCardsHref}
            hasActiveFilters={Boolean(currentSearch || currentSector)}
            clearHref={clearHref}
          />

          <DirectoryPagination
            currentPage={directory.pagination.page}
            totalPages={directory.pagination.total_pages}
            totalItems={directory.pagination.total_items}
            pageSize={PAGE_SIZE}
            hasNext={directory.pagination.has_next}
            hasPrevious={directory.pagination.has_previous}
            currentSearch={currentSearch}
            currentSector={Boolean(filtersError) ? null : currentSector}
          />
        </div>
      </div>
    </PageShell>
  );
}
