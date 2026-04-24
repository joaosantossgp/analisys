"use client";

import dynamic from "next/dynamic";
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
  accent: string;
};

const FEATURES: FeatureCard[] = [
  {
    icon: SearchIcon,
    title: "Busca inteligente",
    description: "Nome, ticker ou codigo CVM com caminho direto para leitura ou on-demand.",
    accent: "primary",
  },
  {
    icon: FileTextIcon,
    title: "DRE, BPA, BPP e DFC",
    description: "Demonstracoes anuais e tabelas navegaveis a partir dos arquivos publicos da CVM.",
    accent: "chart-1",
  },
  {
    icon: BarChart3Icon,
    title: "60+ KPIs",
    description: "Margem, ROE, liquidez e indicadores calculados automaticamente.",
    accent: "chart-2",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Comparacao side-by-side",
    description: "Ate 4 empresas com periodos sincronizados no mesmo fluxo.",
    accent: "chart-3",
  },
  {
    icon: LayersIcon,
    title: "Setores organizados",
    description: "Hubs setoriais reais para conectar empresa, contexto e comparacao.",
    accent: "chart-4",
  },
  {
    icon: TrendingUpIcon,
    title: "On-demand guiado",
    description: "Quando falta historico local, o produto acompanha a solicitacao sem esconder estado.",
    accent: "chart-5",
  },
];

const AnalysisRemotionPlayer = dynamic(
  () =>
    import("@/components/home/analysis-remotion-player").then(
      (mod) => mod.AnalysisRemotionPlayer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[20rem] rounded-[1.35rem] bg-[oklch(0.16_0.025_160)]" />
    ),
  },
);

function getAccentVar(accent: string) {
  return `var(--${accent})`;
}

export function BentoFeatures() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-3">Recursos</p>
        <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.035em] text-foreground">
          Tudo que você precisa para analisar
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Uma leitura unica para descobrir, comparar e aprofundar companhias abertas brasileiras.
        </p>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_28px_90px_-42px_rgba(16,30,24,0.32)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="relative min-h-[22rem] bg-muted/30 p-3 sm:min-h-[25rem]">
            <AnalysisRemotionPlayer />
          </div>

          <div className="grid content-center gap-3 p-4 sm:p-6 lg:grid-cols-2">
            {FEATURES.map((feature) => {
              const accentColor = getAccentVar(feature.accent);
              return (
                <div
                  key={feature.title}
                  className={cn(
                    "group relative overflow-hidden rounded-[1.15rem] border border-border/60 bg-background/72 p-5",
                    "transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background"
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(ellipse at top left, color-mix(in oklch, ${accentColor} 10%, transparent), transparent 62%)`,
                    }}
                  />
                  <div className="relative">
                    <div
                      className="mb-4 flex size-10 items-center justify-center rounded-[12px] transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `color-mix(in oklch, ${accentColor} 12%, transparent)`,
                        border: `1px solid color-mix(in oklch, ${accentColor} 22%, transparent)`,
                        color: accentColor,
                      }}
                    >
                      <feature.icon className="size-4.5" strokeWidth={1.8} />
                    </div>
                    <h3 className="mb-2 font-heading text-base font-semibold tracking-tight text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-[0.84rem] leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
