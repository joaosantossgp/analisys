"use client";

import { Player } from "@remotion/player";
import {
  BarChart3Icon,
  DatabaseIcon,
  FileTextIcon,
  LineChartIcon,
  SearchIcon,
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
  { label: "Cobertura CVM", value: "100%" },
  { label: "KPIs calculados", value: "60+" },
  { label: "Comparacao", value: "4x" },
];

const rows = [
  { label: "Receita liquida", value: "R$ 48.2B", trend: "+12.4%", width: "88%" },
  { label: "Margem EBIT", value: "24.8%", trend: "+3.1 p.p.", width: "72%" },
  { label: "ROE anual", value: "18.6%", trend: "+2.8 p.p.", width: "64%" },
];

const insights = [
  { icon: SearchIcon, label: "Busca", color: "rgba(45, 212, 191, 0.92)" },
  { icon: FileTextIcon, label: "DFP/ITR", color: "rgba(251, 191, 36, 0.9)" },
  { icon: TrendingUpIcon, label: "KPIs", color: "rgba(74, 222, 128, 0.9)" },
];

function getSpring(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 19, stiffness: 86 },
  });
}

function AnalysisRemotionVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = getSpring(frame, fps);
  const loop = (frame % 150) / 150;
  const scanX = interpolate(loop, [0, 1], [-22, 122]);
  const pulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.58, 1],
  );

  return (
    <AbsoluteFill className="overflow-hidden rounded-[1.35rem] bg-[#07110f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(20,184,166,0.28),transparent_29%),radial-gradient(circle_at_78%_16%,rgba(234,179,8,0.18),transparent_25%),radial-gradient(circle_at_84%_84%,rgba(59,130,246,0.14),transparent_32%),linear-gradient(135deg,#0a1a16_0%,#09110f_48%,#050706_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div
        className="absolute bottom-0 top-0 w-28 bg-white/10 blur-2xl"
        style={{ left: `${scanX}%` }}
      />
      <div className="absolute inset-6 rounded-[1.15rem] border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_30px_90px_rgba(0,0,0,0.34)]" />

      <div
        className="relative z-10 grid h-full grid-cols-[0.92fr_1.08fr] gap-8 p-10"
        style={{
          opacity: interpolate(intro, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(intro, [0, 1], [22, 0])}px)`,
        }}
      >
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/18 bg-teal-200/10 px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-teal-100/80">
              <span
                className="size-1.5 rounded-full bg-teal-300"
                style={{ opacity: pulse }}
              />
              Analise guiada
            </div>
            <h3 className="font-heading text-[3rem] font-semibold leading-[0.94] tracking-tight text-white">
              Financial intelligence for every CVM filing.
            </h3>
            <p className="mt-5 max-w-[26rem] text-[1.05rem] leading-7 text-white/66">
              Search companies, compare fundamentals, and move from raw reports
              to investment-grade context in one focused workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {metrics.map((metric, index) => {
              const itemIn = getSpring(frame, fps, 12 + index * 8);

              return (
                <div
                  key={metric.label}
                  className="rounded-[1rem] border border-white/10 bg-white/[0.075] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur"
                  style={{
                    opacity: interpolate(itemIn, [0, 1], [0.3, 1]),
                    transform: `translateY(${interpolate(itemIn, [0, 1], [12, 0])}px)`,
                  }}
                >
                  <div className="font-heading text-[1.65rem] font-semibold leading-none tracking-tight">
                    {metric.value}
                  </div>
                  <div className="mt-2 text-[0.67rem] uppercase tracking-[0.12em] text-white/52">
                    {metric.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="absolute -right-4 top-4 h-32 w-32 rounded-full bg-teal-300/16 blur-3xl" />
          <div className="absolute bottom-4 left-5 h-24 w-24 rounded-full bg-amber-300/12 blur-3xl" />

          <div className="relative h-full rounded-[1.25rem] border border-white/12 bg-[#0b1412]/86 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <div className="text-[0.72rem] uppercase tracking-[0.18em] text-white/42">
                  Dashboard
                </div>
                <div className="mt-1 font-heading text-[1.25rem] font-semibold tracking-tight">
                  Equity snapshot
                </div>
              </div>
              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[0.75rem] font-medium text-emerald-100">
                Live model
              </div>
            </div>

            <div className="grid grid-cols-[1fr_0.72fr] gap-4">
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[0.78rem] font-medium text-white/62">
                    KPI performance
                  </div>
                  <LineChartIcon className="size-4 text-teal-200/80" />
                </div>
                <div className="flex h-32 items-end gap-2">
                  {[36, 58, 44, 70, 62, 86, 76, 94].map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-teal-500/38 to-teal-200/90"
                      style={{
                        height: `${interpolate(
                          getSpring(frame, fps, 22 + index * 3),
                          [0, 1],
                          [12, height],
                        )}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={insight.label}
                    className="flex items-center gap-3 rounded-[0.9rem] border border-white/10 bg-white/[0.05] px-3.5 py-3"
                    style={{
                      opacity: interpolate(
                        getSpring(frame, fps, 28 + index * 7),
                        [0, 1],
                        [0.35, 1],
                      ),
                    }}
                  >
                    <div
                      className="flex size-8 items-center justify-center rounded-[0.65rem]"
                      style={{
                        background: insight.color
                          .replace("0.9", "0.12")
                          .replace("0.92", "0.12"),
                        color: insight.color,
                      }}
                    >
                      <insight.icon className="size-4" strokeWidth={1.8} />
                    </div>
                    <div className="text-[0.82rem] font-medium text-white/72">
                      {insight.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.label}
                  className="rounded-[0.9rem] border border-white/8 bg-white/[0.04] px-4 py-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[0.8rem] text-white/58">
                      {row.label}
                    </span>
                    <span className="font-heading text-[0.95rem] font-semibold text-white">
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
                        width: row.width,
                        transformOrigin: "left",
                        transform: `scaleX(${interpolate(
                          getSpring(frame, fps, 34 + index * 7),
                          [0, 1],
                          [0.18, 1],
                        )})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-[0.9rem] border border-white/8 bg-white/[0.045] p-3">
                <DatabaseIcon className="mb-2 size-4 text-teal-200" />
                <div className="text-[0.7rem] text-white/48">Fonte</div>
                <div className="font-heading text-sm font-semibold">CVM</div>
              </div>
              <div className="rounded-[0.9rem] border border-white/8 bg-white/[0.045] p-3">
                <BarChart3Icon className="mb-2 size-4 text-amber-200" />
                <div className="text-[0.7rem] text-white/48">Periodo</div>
                <div className="font-heading text-sm font-semibold">2024</div>
              </div>
              <div className="rounded-[0.9rem] border border-white/8 bg-white/[0.045] p-3">
                <TrendingUpIcon className="mb-2 size-4 text-emerald-200" />
                <div className="text-[0.7rem] text-white/48">Status</div>
                <div className="font-heading text-sm font-semibold">Ready</div>
              </div>
            </div>
          </div>
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
