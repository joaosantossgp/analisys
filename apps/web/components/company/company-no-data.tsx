import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import {
  InfoChip,
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { CompanyRequestRefreshLazy } from "@/components/company/company-request-refresh-lazy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  fetchCompanyFreshness,
  type CompanyInfo,
  type RefreshStatusItem,
} from "@/lib/api";
import { getCompanyFreshnessCopy } from "@/lib/company-refresh-state";
import { cn } from "@/lib/utils";

type CompanyNoDataPageProps = {
  company: CompanyInfo;
};

type CompanyMetaCardProps = {
  label: string;
  value: string;
};

type ExpectationCardProps = {
  title: string;
  description: string;
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

function ExpectationCard({ title, description }: ExpectationCardProps) {
  return (
    <SurfaceCard tone="inset" padding="md" className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </SurfaceCard>
  );
}

export async function CompanyNoDataPage({ company }: CompanyNoDataPageProps) {
  const sectorLabel =
    company.sector_name || company.setor_analitico || company.setor_cvm || "Setor nao informado";
  let initialFreshness: RefreshStatusItem | null = null;

  try {
    initialFreshness = await fetchCompanyFreshness(company.cd_cvm);
  } catch {
    initialFreshness = null;
  }

  const freshnessCopy = initialFreshness
    ? getCompanyFreshnessCopy(initialFreshness)
    : null;
  const lastOutcomeMessage = freshnessCopy?.latestResultDescription ?? null;

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
            <InfoChip tone="brand">Primeira leitura da companhia</InfoChip>
            <InfoChip>CVM {company.cd_cvm}</InfoChip>
            {company.ticker_b3 ? <InfoChip tone="muted">{company.ticker_b3}</InfoChip> : null}
          </div>

          <SectionHeading
            eyebrow="Historico anual ainda nao liberado"
            title={company.company_name}
            titleAs="h1"
            description="O cadastro desta companhia esta disponivel, mas a leitura detalhada ainda depende de uma carga anual processada. Quando houver historico materializavel, esta pagina passa a liberar KPIs, demonstracoes e Excel."
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
            <AlertTitle>O que destrava esta pagina</AlertTitle>
            <AlertDescription>
              A solicitacao on-demand busca uma serie anual utilizavel na CVM e, quando encontra material suficiente, libera esta mesma aba para leitura. Se a CVM nao tiver historico anual processavel, o resultado aparece aqui de forma clara em vez de falhar em silencio.
              {freshnessCopy?.retryHint ? ` ${freshnessCopy.retryHint}` : ""}
            </AlertDescription>
          </Alert>

          {lastOutcomeMessage ? (
            <Alert className="rounded-[1.75rem] border border-border/70 bg-background/85 px-5 py-5">
              <AlertTitle>Ultimo resultado conhecido</AlertTitle>
              <AlertDescription>{lastOutcomeMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <ExpectationCard
              title="1. O que acontece agora"
              description="A companhia entra na fila interna, o worker tenta montar a serie anual e o status abaixo acompanha esse processo sem tirar voce da pagina."
            />
            <ExpectationCard
              title="2. O que muda quando funciona"
              description="Assim que a leitura ficar materializada, esta mesma rota passa a abrir os KPIs, as demonstracoes financeiras e o download em Excel."
            />
            <ExpectationCard
              title="3. Quando nao houver historico"
              description="Se nao existir serie anual suficiente para a janela padrao, a pagina informa isso claramente e voce pode tentar novamente mais tarde."
            />
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <CompanyRequestRefreshLazy
              cdCvm={company.cd_cvm}
              initialStatus={initialFreshness}
            />
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
