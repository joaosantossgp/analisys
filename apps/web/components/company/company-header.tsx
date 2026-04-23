import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { InfoChip } from "@/components/shared/design-system-recipes";
import { ExcelDownloadButton } from "@/components/shared/excel-download-button";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CompanyInfo } from "@/lib/api";
import { buildCompanyHeroModel } from "@/lib/company-dashboard";
import { getSectorColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CompanyHeaderProps = {
  company: CompanyInfo;
  selectedYears: number[];
};

export function CompanyHeader({ company, selectedYears }: CompanyHeaderProps) {
  const sectorColor = getSectorColor(company.sector_name);
  const hero = buildCompanyHeroModel(company, selectedYears);

  return (
    <div className="space-y-4">
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

      <div
        className="overflow-hidden rounded-2xl border border-border/60 px-6 py-6 lg:px-8 lg:py-8"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, ${sectorColor} 10%, var(--card)) 0%, var(--card) 70%)`,
        }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className="flex size-[88px] shrink-0 items-center justify-center rounded-[20px]"
              style={{ backgroundColor: `${sectorColor}26` }}
            >
              <span
                className="font-heading text-[1.6rem] font-bold leading-none"
                style={{ color: sectorColor }}
              >
                {hero.initials}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {company.ticker_b3 ? (
                  <InfoChip tone="brand">{company.ticker_b3}</InfoChip>
                ) : null}
                <InfoChip>CVM {company.cd_cvm}</InfoChip>
              </div>
              <h1 className="font-heading text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.05] tracking-[-0.04em] text-foreground">
                {company.company_name}
              </h1>
              <p className="text-sm text-muted-foreground">{company.sector_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <ExcelDownloadButton
              endpoint={`/api/companies/${company.cd_cvm}/excel`}
              fallbackFilename={`${company.ticker_b3 ?? `cvm${company.cd_cvm}`}.xlsx`}
              buttonLabel="Excel"
              pendingLabel="Preparando..."
              trackingEvent="company_excel_download_clicked"
              failureTrackingEvent="company_excel_download_failed"
              trackingPayload={{
                cd_cvm: company.cd_cvm,
                company_name: company.company_name,
              }}
              className="rounded-full px-4"
            />
            {hero.sectorHref ? (
              <Link
                href={hero.sectorHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-full px-4",
                )}
              >
                Ver setor
              </Link>
            ) : (
              <Button variant="outline" size="sm" className="rounded-full px-4" disabled>
                Setor indisponível
              </Button>
            )}
            <Link
              href={hero.compareHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "rounded-full px-4",
              )}
            >
              Comparar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
