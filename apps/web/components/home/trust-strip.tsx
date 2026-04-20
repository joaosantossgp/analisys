import type { LucideIcon } from "lucide-react";
import { Building2, FileText, BarChart3, Zap } from "lucide-react";

import type { HealthResponse } from "@/lib/api";
import { formatCompactInteger } from "@/lib/formatters";

type TrustStripProps = {
  health: HealthResponse | null;
  totalCompanies: number | null;
  healthLoading?: boolean;
};

type TrustStatProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  live?: boolean;
};

function TrustStat({ icon: Icon, label, value, hint, live }: TrustStatProps) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
        <Icon className="size-[1.375rem]" strokeWidth={1.5} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-[1.5rem] font-medium tracking-[-0.03em] tabular-nums">
            {value}
          </span>
          {live ? (
            <span
              className="size-1.5 rounded-full bg-primary"
              style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            />
          ) : null}
        </div>
        <p className="mt-0.5 text-[0.72rem] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[0.72rem] text-muted-foreground/70">{hint}</p>
      </div>
    </div>
  );
}

export function TrustStrip({
  health,
  totalCompanies,
  healthLoading = false,
}: TrustStripProps) {
  const isOnline = health?.status === "ok";
  const healthValue = healthLoading
    ? "Verificando"
    : isOnline
      ? "Ao vivo"
      : health
        ? "Offline"
        : "Sem sinal";
  const healthHint = healthLoading
    ? "Checagem assincrona"
    : isOnline
      ? "Pipeline sincronizado"
      : health
        ? "API indisponivel no momento"
        : "Fora do caminho critico";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-6 rounded-[1.75rem] border border-border/60 bg-muted/30 px-6 py-6 sm:grid-cols-4 sm:gap-8 sm:px-8">
        <TrustStat
          icon={Building2}
          label="Companhias abertas"
          value={formatCompactInteger(totalCompanies) ?? "449"}
          hint="CVM - emissores ativos"
        />
        <TrustStat
          icon={FileText}
          label="Demonstracoes"
          value="2.3M"
          hint="DFP, ITR desde 2010"
        />
        <TrustStat
          icon={BarChart3}
          label="KPIs calculados"
          value="60+"
          hint="Por exercicio fiscal"
        />
        <TrustStat
          icon={Zap}
          label="Ultima atualizacao"
          value={healthValue}
          hint={healthHint}
          live={isOnline}
        />
      </div>
    </div>
  );
}
