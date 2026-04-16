import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import {
  InfoChip,
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CompanyInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

type CompanyNoDataPageProps = {
  company: CompanyInfo;
};

type CompanyMetaCardProps = {
  label: string;
  value: string;
};

function CompanyMetaCard({ label, value }: CompanyMetaCardProps) {
  return (
    <SurfaceCard tone="inset" padding="md" className="flex flex-col gap-1.5">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </SurfaceCard>
  );
}

export function CompanyNoDataPage({ company }: CompanyNoDataPageProps) {
  const sectorLabel =
    company.sector_name || company.setor_analitico || company.setor_cvm || "Setor nao informado";

  return (
    <PageShell density="relaxed" className="max-w-5xl">
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

        <SurfaceCard tone="hero" padding="hero" className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <InfoChip tone="brand">PG-03 - Detalhe da empresa</InfoChip>
            <InfoChip>CVM {company.cd_cvm}</InfoChip>
            {company.ticker_b3 ? <InfoChip tone="muted">{company.ticker_b3}</InfoChip> : null}
          </div>

          <SectionHeading
            eyebrow="Dados historicos indisponiveis"
            title={company.company_name}
            titleAs="h1"
            description="O cadastro desta companhia esta disponivel, mas ainda nao existem demonstracoes financeiras processadas para liberar a leitura detalhada."
            descriptionClassName="max-w-3xl"
          />

          <div className="grid gap-4 md:grid-cols-3">
            <CompanyMetaCard label="Setor" value={sectorLabel} />
            <CompanyMetaCard label="CNPJ" value={company.cnpj ?? "Nao informado"} />
            <CompanyMetaCard
              label="Ticker B3"
              value={company.ticker_b3 ?? "Sem ticker"}
            />
          </div>

          <Alert className="rounded-[1.75rem] border border-border/70 bg-muted/28 px-5 py-5">
            <AlertTitle>Dados historicos nao disponiveis</AlertTitle>
            <AlertDescription>
              Esta empresa ainda nao possui anos anuais processados para exibir
              KPIs, demonstracoes financeiras ou exportacao em Excel nesta tela.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-5"
              disabled
            >
              Solicitar dados financeiros
            </Button>
            <Link
              href="/empresas"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "rounded-full px-5",
              )}
            >
              Voltar para o diretorio
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </PageShell>
  );
}
