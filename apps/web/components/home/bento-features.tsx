"use client";

import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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

function getAccentVar(accent: string) {
  return `var(--${accent})`;
}

function AnalysisRemotionVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const loop = (frame % 120) / 120;
  const scanX = interpolate(loop, [0, 1], [-18, 118]);

  const cards = [
    { label: "Dados CVM", value: "100%" },
    { label: "KPIs", value: "60+" },
    { label: "Comparar", value: "4x" },
  ];

  return (
    <AbsoluteFill className="overflow-hidden rounded-[1.35rem] bg-[oklch(0.16_0.025_160)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(72,187,120,0.32),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.25),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_48%)]" />
      <div
        className="absolute bottom-0 top-0 w-16 bg-white/12 blur-xl"
        style={{ left: `${scanX}%` }}
      />
      <div className="absolute inset-5 rounded-[1rem] border border-white/12 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />

      <div
        className="relative z-10 flex h-full flex-col justify-between p-6"
        style={{
          opacity: interpolate(intro, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(intro, [0, 1], [18, 0])}px)`,
        }}
      >
        <div>
          <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-white/72">
            Analise guiada
          </div>
          <h3 className="max-w-[15rem] font-heading text-[1.85rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
            Tudo que você precisa saber para analisar
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {cards.map((card, index) => {
            const itemIn = spring({
              frame: frame - 10 - index * 8,
              fps,
              config: { damping: 16, stiffness: 90 },
            });

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur"
                style={{
                  opacity: interpolate(itemIn, [0, 1], [0.35, 1]),
                  transform: `translateY(${interpolate(itemIn, [0, 1], [10, 0])}px)`,
                }}
              >
                <div className="font-heading text-xl font-semibold tracking-tight">
                  {card.value}
                </div>
                <div className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-white/58">
                  {card.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
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
            <Player
              component={AnalysisRemotionVideo}
              compositionHeight={520}
              compositionWidth={520}
              durationInFrames={180}
              fps={30}
              loop
              autoPlay
              controls={false}
              acknowledgeRemotionLicense
              style={{ width: "100%", height: "100%" }}
            />
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
