"use client";

import {
  BarChart3Icon,
  FileTextIcon,
  GitCompareArrowsIcon,
  type LucideIcon,
  LayersIcon,
  SearchIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  gridClass: string;
  accent: string;
  featured?: boolean;
};

const FEATURES: FeatureCard[] = [
  {
    icon: SearchIcon,
    title: "Busca inteligente",
    description: "Busque por nome, ticker ou codigo CVM e caia direto na leitura pronta ou no caminho on-demand.",
    gridClass: "sm:col-span-2 lg:col-span-1",
    accent: "primary",
  },
  {
    icon: FileTextIcon,
    title: "DRE, BPA, BPP e DFC",
    description: "Demonstracoes anuais e tabelas navegaveis organizadas a partir dos arquivos publicos da CVM.",
    gridClass: "lg:col-span-2",
    accent: "chart-1",
  },
  {
    icon: BarChart3Icon,
    title: "60+ KPIs",
    description: "Indicadores calculados automaticamente: margem, ROE, liquidez e mais.",
    gridClass: "lg:row-span-2",
    accent: "chart-2",
    featured: true,
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Comparacao side-by-side",
    description: "Compare ate 4 empresas simultaneamente com periodos sincronizados.",
    gridClass: "sm:col-span-2 lg:col-span-1",
    accent: "chart-3",
  },
  {
    icon: LayersIcon,
    title: "Setores organizados",
    description: "Navegue por hubs setoriais reais e conecte empresa, contexto e comparacao no mesmo fluxo.",
    gridClass: "",
    accent: "chart-4",
  },
  {
    icon: TrendingUpIcon,
    title: "On-demand quando falta historico",
    description: "Quando a empresa ainda nao tem leitura local, o produto acompanha a solicitacao e explica o resultado sem esconder o estado real.",
    gridClass: "",
    accent: "chart-5",
  },
];

function getAccentVar(accent: string) {
  return `var(--${accent})`;
}

export function BentoFeatures() {
  return (
    <section className="w-full max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-3">Recursos</p>
        <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.035em] text-foreground">
          Tudo que voce precisa para analisar
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Estrutura publica orientada a descoberta, leitura detalhada e comparacao das companhias abertas brasileiras.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const accentColor = getAccentVar(feature.accent);
          return (
            <div
              key={feature.title}
              className={cn(
                "group relative overflow-hidden rounded-[1.25rem] border border-border/60 bg-card p-6 transition-all duration-300",
                "hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_50px_-20px_rgba(16,30,24,0.18)]",
                feature.gridClass,
                feature.featured && "flex flex-col justify-between"
              )}
            >
              {/* Gradient background on hover */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at top left, color-mix(in oklch, ${accentColor} 8%, transparent), transparent 60%)`,
                }}
              />

              <div className="relative">
                <div
                  className="mb-4 flex size-11 items-center justify-center rounded-[12px] transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: `color-mix(in oklch, ${accentColor} 12%, transparent)`,
                    border: `1px solid color-mix(in oklch, ${accentColor} 20%, transparent)`,
                    color: accentColor,
                  }}
                >
                  <feature.icon className="size-5" strokeWidth={1.75} />
                </div>
                <h3 className="mb-2 font-heading text-lg font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-[0.88rem] leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>

              {feature.featured && (
                <div className="relative mt-6 flex items-center gap-2 text-[0.8rem] font-medium text-muted-foreground">
                  <span
                    className="size-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span>Calculo automatico</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
