"use client";

import { Player } from "@remotion/player";
import {
  BarChart3Icon,
  DatabaseIcon,
  FileTextIcon,
  GitCompareArrowsIcon,
  LayersIcon,
  SearchIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Capability = {
  icon: LucideIcon;
  title: string;
  detail: string;
  color: string;
  delay: number;
};

const capabilities: Capability[] = [
  {
    icon: SearchIcon,
    title: "Busca inteligente",
    detail: "Nome, ticker ou codigo CVM",
    color: "rgb(94, 234, 212)",
    delay: 14,
  },
  {
    icon: FileTextIcon,
    title: "Demonstracoes CVM",
    detail: "DRE, BPA, BPP e DFC navegaveis",
    color: "rgb(110, 231, 183)",
    delay: 22,
  },
  {
    icon: BarChart3Icon,
    title: "60+ KPIs",
    detail: "Margens, ROE, liquidez e eficiencia",
    color: "rgb(251, 191, 36)",
    delay: 30,
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Comparacao sincronizada",
    detail: "Ate 4 empresas lado a lado",
    color: "rgb(147, 197, 253)",
    delay: 38,
  },
  {
    icon: LayersIcon,
    title: "Setores organizados",
    detail: "Contexto setorial para leitura rapida",
    color: "rgb(196, 181, 253)",
    delay: 46,
  },
];

const rows = [
  { label: "Receita liquida", value: "R$ 48.2B", trend: "+12.4%", width: 88 },
  { label: "Margem EBIT", value: "24.8%", trend: "+3.1 p.p.", width: 72 },
  { label: "ROE anual", value: "18.6%", trend: "+2.8 p.p.", width: 64 },
];

function getSpring(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 24, stiffness: 76 },
  });
}

function softLoop(frame: number, speed: number, min: number, max: number) {
  return interpolate(Math.sin(frame / speed), [-1, 1], [min, max]);
}

function AnalysisRemotionVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = getSpring(frame, fps);
  const loop = frame % 180;
  const progress = interpolate(loop, [0, 180], [0, 1]);
  const lightX = interpolate(loop, [0, 180], [-12, 112]);
  const activeIndex = Math.floor(interpolate(loop, [0, 180], [0, capabilities.length])) % capabilities.length;

  return (
    <AbsoluteFill className="overflow-hidden bg-[var(--background)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--background)_0%,var(--background)_52%,var(--background)_100%)]" />
      <div
        className="absolute -left-20 top-0 h-[28rem] w-[28rem] rounded-full bg-teal-400/14 blur-3xl"
        style={{
          transform: `translate(${softLoop(frame, 70, -10, 10)}px, ${softLoop(frame + 30, 82, -8, 8)}px)`,
        }}
      />
      <div
        className="absolute right-0 top-8 h-[24rem] w-[24rem] rounded-full bg-amber-200/8 blur-3xl"
        style={{
          transform: `translate(${softLoop(frame + 20, 90, -8, 8)}px, ${softLoop(frame, 72, -10, 10)}px)`,
        }}
      />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:80px_80px]" />
      <div
        className="absolute inset-y-0 w-40 bg-white/[0.055] blur-2xl"
        style={{ left: `${lightX}%` }}
      />

      <div
        className="relative z-10 grid h-full grid-cols-[0.56fr_0.44fr] gap-12 px-14 py-12"
        style={{
          opacity: interpolate(intro, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(intro, [0, 1], [14, 0])}px)`,
        }}
      >
        <section className="flex min-w-0 flex-col">
          <div className="mb-8 flex items-start justify-between gap-8 border-b border-white/10 pb-6">
            <div>
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-teal-100/52">
                Analise guiada
              </div>
              <h3 className="max-w-[34rem] font-heading text-[2.65rem] font-semibold leading-[0.95] tracking-[-0.02em]">
                Financial intelligence for every CVM filing.
              </h3>
            </div>
            <div className="mt-2 shrink-0 rounded-full border border-teal-200/18 bg-teal-200/[0.08] px-4 py-2 text-sm font-medium text-teal-50/86">
              Live model
            </div>
          </div>

          <div className="grid flex-1 grid-cols-[1fr_0.36fr] gap-8">
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <div className="mb-3 flex items-center justify-between text-white/58">
                  <div>
                    <div className="text-sm font-medium text-white/72">
                      Equity command center
                    </div>
                    <div className="mt-1 text-xs text-white/42">
                      Annual view with peer signal
                    </div>
                  </div>
                  <TrendingUpIcon className="size-4 text-teal-100/75" />
                </div>

                <div className="relative h-48 overflow-hidden border-y border-white/10 py-7">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/8" />
                  <div className="absolute inset-x-0 top-[72%] h-px bg-white/6" />
                  <div className="relative flex h-full items-end gap-4">
                    {[36, 58, 44, 70, 62, 86, 76, 94].map((height, index) => {
                      const bar = getSpring(frame, fps, 18 + index * 3);
                      return (
                        <div
                          key={`${height}-${index}`}
                          className="flex-1 rounded-t-lg bg-gradient-to-t from-teal-500/48 via-teal-200/74 to-white/80 shadow-[0_0_26px_rgba(45,212,191,0.16)]"
                          style={{
                            height: `${interpolate(bar, [0, 1], [10, height])}%`,
                            opacity: softLoop(frame + index * 6, 54, 0.8, 1),
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {rows.map((row, index) => (
                  <div key={row.label}>
                    <div className="mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-5 text-sm">
                      <span className="text-white/58">{row.label}</span>
                      <span className="font-heading font-semibold text-white/92">
                        {row.value}
                      </span>
                      <span className="font-medium text-emerald-200/90">
                        {row.trend}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/9">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-200"
                        style={{
                          width: `${row.width}%`,
                          transformOrigin: "left",
                          transform: `scaleX(${interpolate(
                            getSpring(frame, fps, 36 + index * 7),
                            [0, 1],
                            [0.12, softLoop(frame + index * 20, 80, 0.96, 1)],
                          )})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between border-l border-white/10 pl-6">
              {[
                { label: "Fonte", value: "CVM", icon: DatabaseIcon },
                { label: "Universo", value: "800+", icon: BarChart3Icon },
                { label: "Status", value: "Ready", icon: TrendingUpIcon },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="py-2"
                  style={{
                    opacity: interpolate(getSpring(frame, fps, 24 + index * 7), [0, 1], [0.28, 1]),
                    transform: `translateY(${softLoop(frame + index * 22, 86, -1.5, 1.5)}px)`,
                  }}
                >
                  <item.icon className="mb-3 size-4 text-teal-100/80" />
                  <div className="text-xs uppercase tracking-[0.12em] text-white/38">
                    {item.label}
                  </div>
                  <div className="mt-1 font-heading text-[1rem] font-semibold">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative min-w-0 border-l border-white/10 pl-12">
          <div className="mb-8">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-white/42">
              Recursos em movimento
            </div>
            <h4 className="max-w-[25rem] font-heading text-[2.35rem] font-semibold leading-[0.96] tracking-[-0.02em]">
              One calm flow from source data to decision.
            </h4>
            <p className="mt-4 max-w-[28rem] text-base leading-6 text-white/58">
              Busca, demonstracoes, KPIs, comparacao e setores aparecem como uma
              unica trilha de trabalho, sem blocos competindo pela atencao.
            </p>
          </div>

          <div className="relative">
            <div className="absolute bottom-4 left-5 top-5 w-px bg-gradient-to-b from-teal-200/0 via-teal-200/30 to-teal-200/0" />
            <div
              className="absolute left-5 top-5 w-px bg-teal-200/80 shadow-[0_0_18px_rgba(94,234,212,0.45)]"
              style={{ height: `${interpolate(progress, [0, 1], [0, 86])}%` }}
            />

            <div className="space-y-5">
              {capabilities.map((feature, index) => {
                const Icon = feature.icon;
                const itemIn = getSpring(frame, fps, feature.delay);
                const isActive = index === activeIndex;

                return (
                  <div
                    key={feature.title}
                    className="relative grid grid-cols-[2.75rem_1fr] gap-5"
                    style={{
                      opacity: interpolate(itemIn, [0, 1], [0.24, 1]),
                      transform: `translateX(${interpolate(itemIn, [0, 1], [18, 0])}px)`,
                    }}
                  >
                    <div
                      className="relative z-10 flex size-10 items-center justify-center rounded-full border bg-[var(--background)]"
                      style={{
                        borderColor: isActive ? feature.color : "rgba(255,255,255,0.13)",
                        color: feature.color,
                        boxShadow: isActive
                          ? `0 0 28px color-mix(in srgb, ${feature.color} 34%, transparent)`
                          : "none",
                        transform: `scale(${isActive ? softLoop(frame, 36, 1.02, 1.08) : 1})`,
                      }}
                    >
                      <Icon className="size-4.5" strokeWidth={1.8} />
                    </div>
                    <div className="border-b border-white/8 pb-4">
                      <div className="font-heading text-[1.04rem] font-semibold leading-tight">
                        {feature.title}
                      </div>
                      <div className="mt-1 text-sm leading-5 text-white/54">
                        {feature.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AbsoluteFill>
  );
}

export function AnalysisRemotionPlayer() {
  return (
    <Player
      component={AnalysisRemotionVideo}
      compositionHeight={720}
      compositionWidth={1280}
      durationInFrames={180}
      fps={30}
      loop
      autoPlay
      controls={false}
      acknowledgeRemotionLicense
      style={{ width: "100%", height: "100%", aspectRatio: "16 / 9" }}
    />
  );
}
