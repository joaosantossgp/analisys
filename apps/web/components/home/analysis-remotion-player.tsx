"use client";

import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

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

export function AnalysisRemotionPlayer() {
  return (
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
  );
}
