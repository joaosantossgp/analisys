import type { LucideIcon } from "lucide-react";
import { Building2, FileText, BarChart3, Zap } from "lucide-react";

import type { HealthResponse } from "@/lib/api";
import { formatCompactInteger } from "@/lib/formatters";

type TrustStripProps = {
  health: HealthResponse | null;
  totalCompanies: number | null;
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
          {live && (
            <span
              className="size-1.5 rounded-full bg-primary"
              style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            />
          )}
        </div>
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
          {label}
        </p>
        <p className="text-[0.72rem] text-muted-foreground/70 mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

export function TrustStrip({ health, totalCompanies }: TrustStripProps) {
  const isOnline = health?.status === "ok";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-6 rounded-[1.75rem] border border-border/60 bg-muted/30 px-6 py-6 sm:grid-cols-4 sm:gap-8 sm:px-8">
        <TrustStat
          icon={Building2}
          label="Companhias abertas"
          value={formatCompactInteger(totalCompanies) ?? "449"}
          hint="CVM — emissores ativos"
        />
        <TrustStat
          icon={FileText}
          label="Demonstrações"
          value="2.3M"
          hint="DFP, ITR desde 2010"
        />
        <TrustStat
          icon={BarChart3}
          label="KPIs calculados"
          value="60+"
          hint="Por exercício fiscal"
        />
        <TrustStat
          icon={Zap}
          label="Última atualização"
          value={isOnline ? "Ao vivo" : "Offline"}
          hint="Pipeline sincronizado"
          live={isOnline}
        />
      </div>
    </div>
  );
}
