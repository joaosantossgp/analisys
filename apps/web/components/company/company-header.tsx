import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import {
  InfoChip,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { ExcelDownloadButton } from "@/components/shared/excel-download-button";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CompanyInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

type CompanyHeaderProps = {
  company: CompanyInfo;
  selectedYears: number[];
};

export function CompanyHeader({
  company,
  selectedYears,
}: CompanyHeaderProps) {
  const compareParams = new URLSearchParams({
    ids: String(company.cd_cvm),
  });
  if (selectedYears.length > 0) {
    compareParams.set("anos", selectedYears.join(","));
  }
  const compareHref = `/comparar?${compareParams.toString()}`;
  const latestSelectedYear = selectedYears[selectedYears.length - 1] ?? null;
  const earliestSelectedYear = selectedYears[0] ?? null;
  const sectorHref =
    company.sector_slug && latestSelectedYear
      ? `/setores/${company.sector_slug}?ano=${latestSelectedYear}`
      : company.sector_slug
        ? `/setores/${company.sector_slug}`
        : null;

  const freshnessLabel =
    earliestSelectedYear && latestSelectedYear
      ? earliestSelectedYear === latestSelectedYear
        ? `Dados ${latestSelectedYear}`
        : `Dados ${earliestSelectedYear}\u2013${latestSelectedYear}`
      : "Fonte CVM";

  return (
    <div className="space-y-5">
      <nav aria-label="breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRightIcon className="size-4" />
            <Link href="/empresas" className="hover:text-foreground">
              Empresas
            </Link>
          </li>
          <li className="flex items-center gap-2 text-foreground">
            <ChevronRightIcon className="size-4 text-muted-foreground" />
            <span>{company.company_name}</span>
          </li>
        </ol>
      </nav>

      <SurfaceCard tone="hero" padding="hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <InfoChip tone="brand">Detalhe da companhia</InfoChip>
              <InfoChip>CVM {company.cd_cvm}</InfoChip>
              <InfoChip tone="muted">Fonte CVM &middot; {freshnessLabel}</InfoChip>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-4xl tracking-[-0.05em] text-foreground sm:text-5xl">
                {company.company_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{company.ticker_b3 ?? "Sem ticker"}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{company.sector_name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExcelDownloadButton
              endpoint={`/api/companies/${company.cd_cvm}/excel`}
              fallbackFilename={`${company.ticker_b3 ?? `cvm${company.cd_cvm}`}.xlsx`}
              buttonLabel="Baixar Excel"
              pendingLabel="Preparando Excel..."
              trackingEvent="company_excel_download_clicked"
              failureTrackingEvent="company_excel_download_failed"
              trackingPayload={{
                cd_cvm: company.cd_cvm,
                company_name: company.company_name,
              }}
              className="rounded-full px-5"
            />
            {sectorHref ? (
              <Link
                href={sectorHref}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "rounded-full px-4",
                )}
              >
                Ver setor
              </Link>
            ) : (
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full px-4"
                disabled
              >
                Setor indisponivel
              </Button>
            )}
            <Link
              href={compareHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "rounded-full px-4",
              )}
            >
              Comparar
            </Link>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
