import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompanyDetailTracker } from "@/components/company/company-detail-tracker";
import { CompanyHeader } from "@/components/company/company-header";
import { CompanyNoDataPage } from "@/components/company/company-no-data";
import { CompanyOverview } from "@/components/company/company-overview";
import { CompanyStatements } from "@/components/company/company-statements";
import { CompanyUrlTabs } from "@/components/company/company-url-tabs";
import { CompanyYearSelector } from "@/components/company/company-year-selector";
import {
  InfoChip,
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  type CompanyInfo,
  fetchCompanyInfo,
  fetchCompanyKpis,
  fetchCompanyStatement,
  fetchCompanyYears,
  getUserFacingErrorMessage,
  isApiClientError,
} from "@/lib/api";
import { DETAIL_TABS, STATEMENT_OPTIONS } from "@/lib/constants";
import {
  coerceDetailTab,
  coerceStatement,
  getFirstParam,
  normalizeSelectedYears,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";

type EmpresaDetailPageProps = {
  params: Promise<{ cd_cvm: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function DetailPageError({
  message,
}: {
  message: string;
}) {
  return (
    <PageShell density="relaxed" className="max-w-4xl">
      <SurfaceCard tone="default" padding="lg" className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <InfoChip tone="brand">Detalhe da companhia</InfoChip>
        </div>
        <SectionHeading
          title="Detalhes indisponiveis"
          titleAs="h1"
          description="Nao foi possivel carregar os dados desta companhia agora."
        />
        <Alert className="rounded-[1.75rem] border border-destructive/25 bg-destructive/6 px-5 py-5 text-left">
          <AlertTitle>Falha na leitura detalhada</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Link
          href="/empresas"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-fit rounded-full px-5",
          )}
        >
          Voltar para o diretorio
        </Link>
      </SurfaceCard>
    </PageShell>
  );
}

export async function generateMetadata({
  params,
}: EmpresaDetailPageProps): Promise<Metadata> {
  const { cd_cvm } = await params;
  let company = null;

  try {
    company = await fetchCompanyInfo(Number(cd_cvm));
  } catch {
    return {
      title: "Leitura de empresa indisponivel",
    };
  }

  if (!company) {
    return {
      title: "Empresa nao encontrada",
    };
  }

  return {
    title: company.company_name,
    description: `Leitura detalhada de ${company.company_name} com KPIs anuais, selecao de anos e demonstracoes financeiras da CVM.`,
  };
}

export default async function EmpresaDetailPage({
  params,
  searchParams,
}: EmpresaDetailPageProps) {
  const { cd_cvm } = await params;
  const resolvedSearchParams = await searchParams;
  const cdCvm = Number(cd_cvm);
  const pathname = `/empresas/${cdCvm}`;

  let company: CompanyInfo | null = null;
  let availableYears: number[] = [];

  try {
    [company, availableYears] = await Promise.all([
      fetchCompanyInfo(cdCvm),
      fetchCompanyYears(cdCvm),
    ]);
  } catch (error) {
    if (isApiClientError(error) && error.code === "not_found") {
      notFound();
    }
    return <DetailPageError message={getUserFacingErrorMessage(error)} />;
  }

  if (!company) {
    notFound();
  }

  if (availableYears.length === 0) {
    return <CompanyNoDataPage company={company} />;
  }

  const currentTab = coerceDetailTab(getFirstParam(resolvedSearchParams.aba));
  const currentStatement = coerceStatement(getFirstParam(resolvedSearchParams.stmt));
  const selectedYears = normalizeSelectedYears(
    availableYears,
    getFirstParam(resolvedSearchParams.anos),
  );

  let bundle = null;
  let statement = null;
  let contentError: string | null = null;

  if (currentTab === "visao-geral") {
    try {
      bundle = await fetchCompanyKpis(cdCvm, selectedYears);
    } catch (error) {
      contentError = getUserFacingErrorMessage(error);
    }
  } else {
    try {
      statement = await fetchCompanyStatement(cdCvm, selectedYears, currentStatement);
    } catch (error) {
      contentError = getUserFacingErrorMessage(error);
    }
  }

  return (
    <PageShell density="default">
      <CompanyDetailTracker
        cdCvm={company.cd_cvm}
        companyName={company.company_name}
        years={selectedYears}
        tab={currentTab}
        statementType={currentStatement}
      />

      <CompanyHeader company={company} selectedYears={selectedYears} />

      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Periodo
        </span>
        <CompanyYearSelector
          pathname={pathname}
          availableYears={availableYears}
          selectedYears={selectedYears}
        />
      </div>

      <CompanyUrlTabs
        pathname={pathname}
        currentValue={currentTab}
        paramName="aba"
        options={Array.from(DETAIL_TABS)}
      />

      {currentTab === "visao-geral" ? (
        bundle ? (
          <CompanyOverview bundle={bundle} />
        ) : (
          <Alert className="rounded-[1.75rem] border border-destructive/25 bg-destructive/6 px-5 py-5 text-left">
            <AlertTitle>Visao geral indisponivel</AlertTitle>
            <AlertDescription>
              {contentError ??
                "Nao foi possivel carregar os KPIs desta empresa agora."}
            </AlertDescription>
          </Alert>
        )
      ) : (
        <SurfaceCard tone="default" padding="lg" className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeading
              eyebrow="Tipo de demonstracao"
              title="Escolha a visao contabil"
              titleAs="h3"
              description="A tabela respeita os anos selecionados e troca apenas a demonstracao ativa."
              descriptionClassName="text-sm leading-7"
            />
            <CompanyUrlTabs
              pathname={pathname}
              currentValue={currentStatement}
              paramName="stmt"
              options={Array.from(STATEMENT_OPTIONS)}
              eventName="company_statement_changed"
            />
          </div>
          {statement ? (
            <CompanyStatements matrix={statement} />
          ) : (
            <Alert className="rounded-[1.75rem] border border-destructive/25 bg-destructive/6 px-5 py-5 text-left">
              <AlertTitle>Demonstracao indisponivel</AlertTitle>
              <AlertDescription>
                {contentError ??
                  "Nao foi possivel carregar esta demonstracao agora."}
              </AlertDescription>
            </Alert>
          )}
        </SurfaceCard>
      )}
    </PageShell>
  );
}
