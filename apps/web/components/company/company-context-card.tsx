import Link from "next/link";

import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { buttonVariants } from "@/components/ui/button";
import type { CompanyInfo } from "@/lib/api";
import { buildCompanyHeroModel } from "@/lib/company-dashboard";
import { formatYearsLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type CompanyContextCardProps = {
  company: CompanyInfo;
  selectedYears: number[];
  availableYears: number[];
};

export function CompanyContextCard({
  company,
  selectedYears,
  availableYears,
}: CompanyContextCardProps) {
  const hero = buildCompanyHeroModel(company, selectedYears);

  return (
    <SurfaceCard tone="subtle" padding="md" className="space-y-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Contexto de navegação
        </p>
        <h3 className="font-heading text-xl tracking-[-0.02em] text-foreground">
          Continue a leitura
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Use o mesmo recorte anual para cruzar esta empresa com seu setor ou com
          outras companhias prontas.
        </p>
      </div>

      <dl className="grid gap-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Recorte atual</dt>
          <dd className="text-right text-foreground">
            {selectedYears.length > 0 ? formatYearsLabel(selectedYears) : "Sem recorte ativo"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Historico na pagina</dt>
          <dd className="text-right text-foreground">
            {availableYears.length > 0 ? formatYearsLabel(availableYears) : "Sem anos locais"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Setor</dt>
          <dd className="text-right text-foreground">
            {company.sector_name || "Nao informado"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Link
          href={hero.compareHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full px-4")}
        >
          Comparar
        </Link>
        {hero.sectorHref ? (
          <Link
            href={hero.sectorHref}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full px-4")}
          >
            Ver setor
          </Link>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
