import {
  BarChart3Icon,
  Building2Icon,
  GitCompareArrowsIcon,
  LayersIcon,
  LineChartIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: SearchIcon,
    title: "Busca Inteligente",
    description:
      "Encontre qualquer empresa listada na CVM. Filtros por setor, ticker e nome.",
    href: "/empresas",
    color: "var(--chart-1)",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Comparacao Side-by-Side",
    description:
      "Compare ate 4 empresas simultaneamente. Veja onde divergem os indicadores.",
    href: "/comparar",
    color: "var(--chart-2)",
  },
  {
    icon: LayersIcon,
    title: "Leitura Setorial",
    description:
      "Navegue por setores e descubra padroes de mercado. Rankings e tendencias.",
    href: "/setores",
    color: "var(--chart-3)",
  },
  {
    icon: BarChart3Icon,
    title: "60+ KPIs Calculados",
    description:
      "Indicadores padronizados por exercicio fiscal. ROE, ROIC, margem, liquidez.",
    href: null,
    color: "var(--chart-4)",
  },
  {
    icon: LineChartIcon,
    title: "Historico 10+ Anos",
    description:
      "DRE, Balanco e DFC desde 2010. Dados oficiais direto da CVM.",
    href: null,
    color: "var(--chart-5)",
  },
  {
    icon: Building2Icon,
    title: "449 Companhias",
    description:
      "Acesso completo ao universo de emissores ativos na B3. Cobertura total.",
    href: "/empresas",
    color: "var(--chart-1)",
  },
] as const;

type FeatureCardProps = {
  icon: typeof SearchIcon;
  title: string;
  description: string;
  href: string | null;
  color: string;
};

function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  color,
}: FeatureCardProps) {
  const content = (
    <>
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:scale-105"
        style={{
          background: `color-mix(in oklch, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in oklch, ${color} 20%, transparent)`,
        }}
      >
        <Icon className="size-5" style={{ color }} strokeWidth={1.75} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
            {title}
          </h3>
          {!href && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Em breve
            </span>
          )}
        </div>
        <p className="text-[0.88rem] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </>
  );

  const className = cn(
    "group flex flex-col gap-4 rounded-[1.5rem] border border-border/60 bg-card p-6 transition-all duration-200",
    href &&
      "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_40px_-28px_rgba(16,30,24,0.22)]"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={cn(className, "opacity-75")}>{content}</div>;
}

export function FeaturesSection() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div className="text-center">
        <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-muted-foreground">
          Recursos
        </p>
        <h2 className="font-heading text-[2rem] font-medium tracking-[-0.04em] text-foreground sm:text-[2.5rem]">
          Tudo que voce precisa{" "}
          <span className="text-muted-foreground">para analisar.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground">
          Ferramentas projetadas para leitura rapida e decisoes informadas.
          Dados oficiais, calculos padronizados, interface limpa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
