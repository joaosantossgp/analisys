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
      <div className="aspect-video w-full rounded-[1.35rem] bg-[#07110f]" />
    ),
  },
);

function getAccentVar(accent: string) {
  return `var(--${accent})`;
}

export function BentoFeatures() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-3">Recursos</p>
        <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.035em] text-foreground">
          Tudo que você precisa para analisar
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Uma leitura unica para descobrir, comparar e aprofundar companhias abertas brasileiras.
        </p>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080d0c] p-3 shadow-[0_34px_110px_-50px_rgba(7,18,15,0.72)]">
        <div className="grid items-center gap-3 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07110f] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
            <div className="aspect-video w-full">
              <AnalysisRemotionPlayer />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const accentColor = getAccentVar(feature.accent);
              return (
                <div
                  key={feature.title}
                  className={cn(
                    "group relative overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/[0.045] p-4",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300",
                    "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(ellipse at top left, color-mix(in oklch, ${accentColor} 18%, transparent), transparent 64%)`,
                    }}
                  />
                  <div className="relative">
                    <div
                      className="mb-3 flex size-9 items-center justify-center rounded-[0.8rem] transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `color-mix(in oklch, ${accentColor} 16%, transparent)`,
                        border: `1px solid color-mix(in oklch, ${accentColor} 30%, transparent)`,
                        color: accentColor,
                      }}
                    >
                      <feature.icon className="size-4.5" strokeWidth={1.8} />
                    </div>
                    <h3 className="mb-1.5 font-heading text-[0.98rem] font-semibold tracking-tight text-white">
                      {feature.title}
                    </h3>
                    <p className="text-[0.82rem] leading-relaxed text-white/58">
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
