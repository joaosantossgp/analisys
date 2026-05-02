"use client";

import { Player } from "@remotion/player";
import {
  ActivityIcon,
  BarChart3Icon,
  DatabaseIcon,
  FileTextIcon,
  GitCompareArrowsIcon,
  LayersIcon,
  LineChartIcon,
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
    color: "rgba(45, 212, 191, 0.96)",
    delay: 18,
  },
  {
    icon: FileTextIcon,
    title: "DRE, BPA, BPP e DFC",
    detail: "Tabelas anuais navegaveis",
    color: "rgba(52, 211, 153, 0.94)",
    delay: 26,
  },
  {
    icon: BarChart3Icon,
    title: "60+ KPIs",
    detail: "Margens, ROE e liquidez",
    color: "rgba(251, 113, 133, 0.94)",
    delay: 34,
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Comparacao side-by-side",
    detail: "Ate 4 empresas sincronizadas",
    color: "rgba(96, 165, 250, 0.96)",
    delay: 42,
  },
  {
    icon: LayersIcon,
    title: "Setores organizados",
    detail: "Contexto setorial conectado",
    color: "rgba(251, 191, 36, 0.95)",
    delay: 50,
  },
  {
    icon: TrendingUpIcon,
    title: "On-demand guiado",
    detail: "Refresh acompanhado ponta a ponta",
    color: "rgba(216, 180, 254, 0.96)",
    delay: 58,
  },
];

const rows = [
  { label: "Receita liquida", value: "R$ 48.2B", trend: "+12.4%", width: 88 },
  { label: "Margem EBIT", value: "24.8%", trend: "+3.1 p.p.", width: 72 },
  { label: "ROE anual", value: "18.6%", trend: "+2.8 p.p.", width: 64 },
];

const streamItems = [
  "DRE",
  "BPA",
  "BPP",
  "DFC",
  "ROE",
  "EBIT",
  "LIQUIDEZ",
  "SETORES",
  "PEERS",
  "EXCEL",
];

function getSpring(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 88 },
  });
}

function oscillate(frame: number, speed: number, min: number, max: number) {
  return interpolate(Math.sin(frame / speed), [-1, 1], [min, max]);
}

function AnalysisRemotionVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = getSpring(frame, fps);
  const loop = frame % 180;
  const gridShift = interpolate(loop, [0, 180], [0, -64]);
  const scanX = interpolate(loop, [0, 180], [-16, 116]);
  const orbit = interpolate(loop, [0, 180], [0, 360]);
  const tickerX = interpolate(loop, [0, 180], [0, -50]);
  const auroraA = oscillate(frame, 34, -12, 12);
  const auroraB = oscillate(frame + 50, 43, -14, 14);

  return (
    <AbsoluteFill className="overflow-hidden rounded-[1.35rem] bg-[#050908] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#071511_0%,#08110f_42%,#050706_100%)]" />
      <div
        className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-teal-400/22 blur-3xl"
        style={{ transform: `translate(${auroraA}px, ${auroraB}px)` }}
      />
      <div
        className="absolute right-[-4rem] top-8 h-72 w-72 rounded-full bg-amber-300/12 blur-3xl"
        style={{ transform: `translate(${-auroraB}px, ${auroraA}px)` }}
      />
      <div
        className="absolute bottom-[-6rem] right-40 h-80 w-80 rounded-full bg-blue-400/12 blur-3xl"
        style={{ transform: `translate(${auroraB}px, ${-auroraA}px)` }}
      />
      <div
        className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px]"
        style={{ backgroundPosition: `${gridShift}px ${gridShift}px` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_44%,transparent_0%,rgba(0,0,0,0.22)_65%,rgba(0,0,0,0.62)_100%)]" />

      <div
        className="absolute bottom-0 top-0 w-36 bg-white/10 blur-2xl"
        style={{ left: `${scanX}%` }}
      />
      <div className="absolute inset-5 rounded-[1.2rem] border border-white/10 bg-white/[0.026] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_90px_rgba(0,0,0,0.36)]" />

      <div
        className="absolute left-[56%] top-[51%] h-[36rem] w-[36rem] rounded-full border border-teal-200/8"
        style={{ transform: `translate(-50%, -50%) rotate(${orbit}deg)` }}
      >
        <span className="absolute -top-1 left-1/2 size-2 rounded-full bg-teal-200 shadow-[0_0_22px_rgba(94,234,212,0.8)]" />
        <span className="absolute bottom-12 right-8 size-1.5 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(253,230,138,0.75)]" />
      </div>
      <div
        className="absolute left-[56%] top-[51%] h-[25rem] w-[25rem] rounded-full border border-white/7"
        style={{ transform: `translate(-50%, -50%) rotate(${-orbit * 0.62}deg)` }}
      />

      <div
        className="relative z-20 grid h-full grid-cols-[0.58fr_0.42fr] gap-8 px-9 pb-16 pt-8"
        style={{
          opacity: interpolate(intro, [0, 1], [0, 1]),
          transform: `scale(${interpolate(intro, [0, 1], [0.985, 1])}) translateY(${interpolate(intro, [0, 1], [18, 0])}px)`,
        }}
      >
        <section className="relative min-w-0">
          <div className="absolute -left-4 top-16 h-px w-28 rotate-[-16deg] bg-gradient-to-r from-teal-200/0 via-teal-200/45 to-teal-200/0" />
          <div className="absolute bottom-10 right-6 h-px w-36 rotate-[13deg] bg-gradient-to-r from-amber-200/0 via-amber-200/28 to-amber-200/0" />

          <div className="relative h-full overflow-hidden rounded-[1.25rem] border border-white/12 bg-[#0a1311]/88 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <div className="text-[0.66rem] uppercase text-white/42">
                  Analise guiada
                </div>
                <h3 className="mt-1 font-heading text-[2.3rem] font-semibold leading-[0.96]">
                  Financial intelligence for every CVM filing.
                </h3>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[0.72rem] font-medium text-emerald-100">
                <ActivityIcon className="size-3.5" />
                Live model
              </div>
            </div>

            <div className="grid grid-cols-[1fr_0.58fr] gap-4">
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[0.78rem] font-medium text-white/64">
                      Equity command center
                    </div>
                    <div className="mt-1 text-[0.68rem] text-white/38">
                      Annual view with peer signal
                    </div>
                  </div>
                  <LineChartIcon className="size-4 text-teal-200/80" />
                </div>
                <div className="relative flex h-24 items-end gap-2 overflow-hidden rounded-[0.7rem] bg-black/12 px-2 pb-2">
                  <div
                    className="absolute inset-x-0 top-1/2 h-px bg-teal-200/18"
                    style={{
                      transform: `translateY(${oscillate(frame, 16, -12, 12)}px)`,
                    }}
                  />
                  {[36, 58, 44, 70, 62, 86, 76, 94].map((height, index) => {
                    const bar = getSpring(frame, fps, 18 + index * 3);
                    return (
                      <div
                        key={`${height}-${index}`}
                        className="relative flex-1 rounded-t-md bg-gradient-to-t from-teal-500/40 to-teal-100/95 shadow-[0_0_18px_rgba(45,212,191,0.18)]"
                        style={{
                          height: `${interpolate(bar, [0, 1], [12, height])}%`,
                          opacity: oscillate(frame + index * 5, 18, 0.72, 1),
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: DatabaseIcon, label: "Fonte", value: "CVM" },
                  { icon: BarChart3Icon, label: "Universo", value: "800+" },
                  { icon: TrendingUpIcon, label: "Status", value: "Ready" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-[0.9rem] border border-white/8 bg-white/[0.045] p-3"
                    style={{
                      transform: `translateY(${oscillate(frame + index * 18, 40, -2, 2)}px)`,
                    }}
                  >
                    <item.icon className="mb-2 size-4 text-teal-200" />
                    <div className="text-[0.68rem] text-white/48">{item.label}</div>
                    <div className="font-heading text-[0.9rem] font-semibold">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_0.4fr] gap-4">
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={row.label}
                    className="rounded-[0.9rem] border border-white/8 bg-white/[0.04] px-3.5 py-2"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[0.78rem] text-white/58">
                        {row.label}
                      </span>
                      <span className="font-heading text-[0.88rem] font-semibold">
                        {row.value}
                      </span>
                      <span className="text-[0.72rem] font-medium text-emerald-200">
                        {row.trend}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300"
                        style={{
                          width: `${row.width}%`,
                          transformOrigin: "left",
                          transform: `scaleX(${interpolate(
                            getSpring(frame, fps, 34 + index * 7),
                            [0, 1],
                            [0.18, oscillate(frame + index * 16, 42, 0.93, 1)],
                          )})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-between rounded-[0.95rem] border border-white/8 bg-white/[0.04] p-3">
                <div>
                  <div className="text-[0.66rem] uppercase text-white/42">
                    Pipeline
                  </div>
                  <div className="mt-1 font-heading text-[0.9rem] font-semibold">
                    DFP -&gt; KPI
                  </div>
                </div>
                <div className="relative h-14">
                  <div className="absolute left-1/2 top-1 h-12 w-px bg-gradient-to-b from-teal-200/0 via-teal-200/40 to-teal-200/0" />
                  {[0, 1, 2].map((item) => (
                    <span
                      key={item}
                      className="absolute left-1/2 size-2.5 rounded-full border border-teal-100/45 bg-[#07110f] shadow-[0_0_18px_rgba(45,212,191,0.45)]"
                      style={{
                        top: `${8 + item * 32}%`,
                        transform: `translateX(-50%) scale(${oscillate(frame + item * 12, 12, 0.82, 1.18)})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3 text-[0.68rem] uppercase text-white/42">
              <span className="size-1.5 rounded-full bg-teal-200 shadow-[0_0_14px_rgba(94,234,212,0.72)]" />
              100% cobertura CVM
              <span className="mx-1 text-white/18">/</span>
              60+ KPIs
              <span className="mx-1 text-white/18">/</span>
              4x comparar
            </div>
          </div>
        </section>

        <section className="relative min-w-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.032] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="absolute inset-y-8 left-10 w-px bg-gradient-to-b from-teal-200/0 via-teal-200/28 to-teal-200/0" />
          <div className="absolute left-10 top-[13%] h-[74%] w-[74%] rounded-full border border-white/7" />
          <div
            className="absolute left-10 top-[13%] h-[74%] w-[74%] rounded-full border border-teal-200/8"
            style={{ transform: `rotate(${-orbit * 0.38}deg)` }}
          />

          <div className="relative z-10 mb-3">
            <div className="text-[0.72rem] uppercase text-white/42">
              Recursos em movimento
            </div>
            <h4 className="mt-2 max-w-[22rem] font-heading text-[1.95rem] font-semibold leading-[0.98]">
              One flow from source data to decision.
            </h4>
            <p className="mt-2 max-w-[24rem] text-[0.84rem] leading-5 text-white/58">
              Tudo fica dentro da mesma cena: busca, demonstracoes, KPIs,
              comparacao, setores e refresh on-demand.
            </p>
          </div>

          <div className="relative z-10 space-y-1.5">
            {capabilities.map((feature, index) => {
              const itemIn = getSpring(frame, fps, feature.delay);
              const Icon = feature.icon;
              const y = oscillate(frame + index * 10, 34, -2, 2);

              return (
                <div
                  key={feature.title}
                  className="relative flex items-center gap-3 py-1.5"
                  style={{
                    opacity: interpolate(itemIn, [0, 1], [0.18, 1]),
                    transform: `translateX(${interpolate(itemIn, [0, 1], [22, 0])}px) translateY(${y}px)`,
                  }}
                >
                  <div
                    className="relative flex size-9 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      borderColor: feature.color.replace("0.96", "0.28").replace("0.95", "0.28").replace("0.94", "0.28"),
                      background: feature.color.replace("0.96", "0.12").replace("0.95", "0.12").replace("0.94", "0.12"),
                      color: feature.color,
                    }}
                  >
                    <span
                      className="absolute inset-[-0.35rem] rounded-full border border-current opacity-20"
                      style={{ transform: `scale(${oscillate(frame + index * 8, 18, 0.9, 1.08)})` }}
                    />
                    <Icon className="size-4.5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1 border-b border-white/8 pb-1.5">
                    <div className="font-heading text-[0.96rem] font-semibold leading-tight">
                      {feature.title}
                    </div>
                    <div className="mt-0.5 text-[0.76rem] leading-snug text-white/54">
                      {feature.detail}
                    </div>
                  </div>
                  <div
                    className="h-px w-12 shrink-0 bg-gradient-to-r from-white/20 to-transparent"
                    style={{ opacity: oscillate(frame + index * 9, 20, 0.32, 0.82) }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="absolute inset-x-8 bottom-4 z-30 overflow-hidden rounded-full border border-white/8 bg-black/18 py-1 backdrop-blur">
        <div
          className="flex w-[200%] gap-3 whitespace-nowrap text-[0.7rem] uppercase text-white/48"
          style={{ transform: `translateX(${tickerX}%)` }}
        >
          {[...streamItems, ...streamItems].map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="inline-flex items-center gap-2 rounded-full px-3"
            >
              <span className="size-1 rounded-full bg-teal-200/70" />
              {item}
            </div>
          ))}
        </div>
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
