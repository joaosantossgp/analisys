import Link from "next/link";

import { CompanyContextCard } from "@/components/company/company-context-card";
import { CompanyFreshnessCard } from "@/components/company/company-freshness-card";
import { CompanyHeader } from "@/components/company/company-header";
import {
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
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

type ExpectationCardProps = {
  title: string;
  description: string;
};

function ExpectationCard({ title, description }: ExpectationCardProps) {
  return (
    <SurfaceCard tone="inset" padding="md" className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </SurfaceCard>
  );
}

export async function CompanyNoDataPage({ company }: CompanyNoDataPageProps) {
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
    <PageShell density="default">
      <CompanyHeader company={company} selectedYears={[]} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <SurfaceCard tone="default" padding="lg" className="space-y-6">
            <SectionHeading
              eyebrow="Historico anual ainda nao liberado"
              title="Esta empresa ainda depende da primeira materializacao"
              titleAs="h2"
              description="O cadastro da companhia ja esta disponivel, mas esta pagina ainda nao encontrou uma serie anual local utilizavel. Quando a leitura on-demand conseguir materializar o historico, este mesmo shell libera os KPIs, o grafico, a tabela anual e as demonstracoes."
              descriptionClassName="max-w-3xl text-sm leading-7"
            />

            <Alert className="rounded-[1.5rem] border border-border/70 bg-muted/24 px-5 py-5">
              <AlertTitle>O que destrava esta pagina</AlertTitle>
              <AlertDescription>
                A solicitacao on-demand busca uma serie anual processavel na CVM e
                atualiza o painel lateral com o status real da tentativa. Quando o
                processamento encontra historico suficiente, esta mesma rota passa a
                abrir a visao geral completa e as demonstracoes.
                {freshnessCopy?.retryHint ? ` ${freshnessCopy.retryHint}` : ""}
              </AlertDescription>
            </Alert>

            {lastOutcomeMessage ? (
              <Alert className="rounded-[1.5rem] border border-border/70 bg-background/82 px-5 py-5">
                <AlertTitle>Ultimo resultado conhecido</AlertTitle>
                <AlertDescription>{lastOutcomeMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <ExpectationCard
                title="1. Acompanhe pelo painel lateral"
                description="O card de freshness continua visivel neste mesmo layout e concentra status, progresso, retry e mudanca de estado quando a leitura for concluida."
              />
              <ExpectationCard
                title="2. Quando a leitura funcionar"
                description="A rota troca para o dashboard real da companhia sem mudar de pagina, preservando o mesmo header, a mesma identidade visual e os mesmos links de contexto."
              />
              <ExpectationCard
                title="3. Quando nao houver historico suficiente"
                description="A pagina continua explicitando o resultado terminal de forma calma e reutilizavel, em vez de cair num estado generico ou contraditorio."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/empresas"
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "rounded-full px-5")}
              >
                Voltar para o diretorio
              </Link>
            </div>
          </SurfaceCard>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <CompanyFreshnessCard cdCvm={company.cd_cvm} />
          <CompanyContextCard company={company} selectedYears={[]} availableYears={[]} />
        </div>
      </div>
    </PageShell>
  );
}
