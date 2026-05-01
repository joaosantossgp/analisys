"use client";

import { Player } from "@remotion/player";
import {
  ActivityIcon,
  BarChart3Icon,
  Building2Icon,
  DatabaseIcon,
  FileTextIcon,
  LineChartIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const metrics = [
  { label: "Cobertura CVM", value: "100%", delay: 10 },
  { label: "KPIs calculados", value: "60+", delay: 18 },
  { label: "Comparacao", value: "4x", delay: 26 },
];

const rows = [
  { label: "Receita liquida", value: "R$ 48.2B", trend: "+12.4%", width: 88 },
  { label: "Margem EBIT", value: "24.8%", trend: "+3.1 p.p.", width: 72 },
  { label: "ROE anual", value: "18.6%", trend: "+2.8 p.p.", width: 64 },
];

const insightCards = [
  {
    icon: SearchIcon,
    label: "Busca ativa",
    value: "PETR4",
    color: "rgba(45, 212, 191, 0.92)",
    delay: 24,
  },
  {
    icon: FileTextIcon,
    label: "Demonstracoes",
    value: "DFP + ITR",
    color: "rgba(251, 191, 36, 0.9)",
    delay: 34,
  },
  {
    icon: TrendingUpIcon,
    label: "Modelo",
    value: "Atualizado",
    color: "rgba(74, 222, 128, 0.9)",
    delay: 44,
  },
];

const streamItems = [
  "DRE",
  "BPA",
  "BPP",
  "DFC",
  "ROE",
  "EBIT",
  "Liquidez",
  "Setores",
  "Peers",
  "Excel",
];

const floatingNotes = [
  { label: "CVM filings", value: "2.3M rows", x: 7, y: 18, delay: 18 },
  { label: "Sector lens", value: "Context on", x: 75, y: 13, delay: 32 },
  { label: "Export ready", value: "Workbook", x: 76, y: 72, delay: 46 },
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
  const scanX = interpolate(loop, [0, 180], [-18, 118]);
  const auroraA = oscillate(frame, 34, -10, 10);
  const auroraB = oscillate(frame + 40, 42, -12, 12);
  const orbit = interpolate(loop, [0, 180], [0, 360]);
  const tickerX = interpolate(loop, [0, 180], [0, -50]);

  return (
    <AbsoluteFill className="overflow-hidden rounded-[1.35rem] bg-[#050908] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#071511_0%,#08110f_42%,#050706_100%)]" />
      <div
        className="absolute -left-28 -top-20 h-72 w-72 rounded-full bg-teal-400/22 blur-3xl"
        style={{ transform: `translate(${auroraA}px, ${auroraB}px)` }}
      />
      <div
        className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-amber-300/14 blur-3xl"
        style={{ transform: `translate(${-auroraB}px, ${auroraA}px)` }}
      />
      <div
        className="absolute bottom-[-5rem] right-24 h-72 w-72 rounded-full bg-blue-400/12 blur-3xl"
        style={{ transform: `translate(${auroraB}px, ${-auroraA}px)` }}
      />
      <div
        className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px]"
        style={{ backgroundPosition: `${gridShift}px ${gridShift}px` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0%,rgba(0,0,0,0.34)_74%,rgba(0,0,0,0.58)_100%)]" />

      <div
        className="absolute bottom-0 top-0 w-32 bg-white/10 blur-2xl"
        style={{ left: `${scanX}%` }}
      />

      <div
        className="absolute left-[54%] top-[50%] h-[34rem] w-[34rem] rounded-full border border-teal-200/8"
        style={{
          transform: `translate(-50%, -50%) rotate(${orbit}deg)`,
        }}
      >
        <div className="absolute -top-1 left-1/2 size-2 rounded-full bg-teal-200 shadow-[0_0_22px_rgba(94,234,212,0.8)]" />
        <div className="absolute bottom-10 right-8 size-1.5 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(253,230,138,0.75)]" />
      </div>
      <div
        className="absolute left-[54%] top-[50%] h-[24rem] w-[24rem] rounded-full border border-white/7"
        style={{
          transform: `translate(-50%, -50%) rotate(${-orbit * 0.65}deg)`,
        }}
      >
        <div className="absolute left-8 top-8 size-1.5 rounded-full bg-emerald-200 shadow-[0_0_18px_rgba(167,243,208,0.72)]" />
      </div>

      <div className="absolute inset-5 rounded-[1.2rem] border border-white/10 bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_90px_rgba(0,0,0,0.36)]" />

      {floatingNotes.map((note) => {
        const itemIn = getSpring(frame, fps, note.delay);
        return (
          <div
            key={note.label}
            className="absolute z-10 rounded-[0.9rem] border border-white/10 bg-[#0b1512]/76 px-3 py-2 shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-md"
            style={{
              left: `${note.x}%`,
              top: `${note.y}%`,
              opacity: interpolate(itemIn, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(itemIn, [0, 1], [14, oscillate(frame + note.delay, 38, -3, 3)])}px)`,
            }}
          >
            <div className="text-[0.62rem] uppercase text-white/40">
              {note.label}
            </div>
            <div className="mt-0.5 font-heading text-[0.82rem] font-semibold">
              {note.value}
            </div>
          </div>
        );
      })}

      <div
        className="relative z-20 grid h-full grid-cols-[0.78fr_1.22fr] gap-7 px-9 pb-12 pt-8"
        style={{
          opacity: interpolate(intro, [0, 1], [0, 1]),
          transform: `scale(${interpolate(intro, [0, 1], [0.985, 1])}) translateY(${interpolate(intro, [0, 1], [18, 0])}px)`,
        }}
      >
        <section className="flex min-w-0 flex-col justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/18 bg-teal-200/10 px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase text-teal-100/80">
              <span
                className="size-1.5 rounded-full bg-teal-300 shadow-[0_0_18px_rgba(94,234,212,0.8)]"
                style={{ opacity: oscillate(frame, 9, 0.5, 1) }}
              />
              Analise guiada
            </div>
            <h3 className="font-heading text-[2.65rem] font-semibold leading-[0.96] text-white">
              Financial intelligence for every CVM filing.
            </h3>
            <p className="mt-4 max-w-[24rem] text-[0.98rem] leading-6 text-white/66">
              Search companies, compare fundamentals, and move from raw reports
              to investment-grade context in one focused workspace.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative h-16 overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.05] p-3">
              <div className="mb-2 flex items-center justify-between text-[0.68rem] uppercase text-white/45">
                <span>Data pipeline</span>
                <span>live sync</span>
              </div>
              <div className="relative h-5">
                <div className="absolute left-2 right-2 top-1/2 h-px bg-gradient-to-r from-teal-200/0 via-teal-200/45 to-emerald-200/0" />
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="absolute top-1/2 size-2.5 rounded-full border border-teal-100/45 bg-[#07110f] shadow-[0_0_18px_rgba(45,212,191,0.45)]"
                    style={{
                      left: `${12 + item * 25}%`,
                      transform: `translateY(-50%) scale(${oscillate(frame + item * 12, 12, 0.82, 1.18)})`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {metrics.map((metric) => {
                const itemIn = getSpring(frame, fps, metric.delay);

                return (
                  <div
                    key={metric.label}
                    className="rounded-[1rem] border border-white/10 bg-white/[0.075] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                    style={{
                      opacity: interpolate(itemIn, [0, 1], [0.25, 1]),
                      transform: `translateY(${interpolate(itemIn, [0, 1], [12, 0])}px)`,
                    }}
                  >
                    <div className="font-heading text-[1.38rem] font-semibold leading-none">
                      {metric.value}
                    </div>
                    <div className="mt-1.5 text-[0.58rem] uppercase text-white/52">
                      {metric.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative min-w-0">
          <div className="absolute -left-5 top-16 h-px w-24 rotate-[-18deg] bg-gradient-to-r from-teal-200/0 via-teal-200/45 to-teal-200/0" />
          <div className="absolute -bottom-2 right-10 h-px w-32 rotate-[14deg] bg-gradient-to-r from-amber-200/0 via-amber-200/30 to-amber-200/0" />

          <div className="relative h-full rounded-[1.25rem] border border-white/12 bg-[#0a1311]/88 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <div className="text-[0.72rem] uppercase text-white/42">
                  Dashboard
                </div>
                <div className="mt-1 font-heading text-[1.25rem] font-semibold">
                  Equity command center
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[0.72rem] font-medium text-emerald-100">
                <ActivityIcon className="size-3.5" />
                Live model
              </div>
            </div>

            <div className="grid grid-cols-[1.04fr_0.58fr] gap-4">
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[0.78rem] font-medium text-white/64">
                      KPI performance
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
                    style={{ transform: `translateY(${oscillate(frame, 16, -12, 12)}px)` }}
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
                {insightCards.map((insight, index) => {
                  const itemIn = getSpring(frame, fps, insight.delay);
                  return (
                    <div
                      key={insight.label}
                      className="rounded-[0.9rem] border border-white/10 bg-white/[0.05] p-2.5"
                      style={{
                        opacity: interpolate(itemIn, [0, 1], [0.25, 1]),
                        transform: `translateX(${interpolate(itemIn, [0, 1], [14, oscillate(frame + index * 10, 34, -2, 2)])}px)`,
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div
                          className="flex size-7 items-center justify-center rounded-[0.65rem]"
                          style={{
                            background: insight.color
                              .replace("0.9", "0.12")
                              .replace("0.92", "0.12"),
                            color: insight.color,
                          }}
                        >
                          <insight.icon className="size-3.5" strokeWidth={1.8} />
                        </div>
                        <span className="size-1.5 rounded-full bg-emerald-200" />
                      </div>
                      <div className="text-[0.72rem] text-white/46">
                        {insight.label}
                      </div>
                      <div className="mt-0.5 font-heading text-[0.84rem] font-semibold">
                        {insight.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_0.64fr] gap-4">
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={row.label}
                  className="rounded-[0.9rem] border border-white/8 bg-white/[0.04] px-3.5 py-2"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[0.8rem] text-white/58">
                        {row.label}
                      </span>
                    <span className="font-heading text-[0.88rem] font-semibold">
                        {row.value}
                      </span>
                      <span className="text-[0.74rem] font-medium text-emerald-200">
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

              <div className="grid gap-3">
                {[
                  { icon: DatabaseIcon, label: "Fonte", value: "CVM" },
                  { icon: Building2Icon, label: "Universo", value: "800+" },
                  { icon: ShieldCheckIcon, label: "Status", value: "Ready" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                  className="rounded-[0.9rem] border border-white/8 bg-white/[0.045] p-2.5"
                    style={{
                      transform: `translateY(${oscillate(frame + index * 18, 40, -2, 2)}px)`,
                    }}
                  >
                    <item.icon className="mb-1.5 size-4 text-teal-200" />
                    <div className="text-[0.7rem] text-white/48">{item.label}</div>
                    <div className="font-heading text-[0.82rem] font-semibold">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="absolute inset-x-8 bottom-5 z-30 overflow-hidden rounded-full border border-white/8 bg-black/18 py-1.5 backdrop-blur">
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
