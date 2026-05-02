"use client";

import dynamic from "next/dynamic";

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

export function BentoFeatures() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-3">Recursos</p>
        <h2 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.035em] text-foreground">
          Tudo que voce precisa para analisar
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Uma leitura unica para descobrir, comparar e aprofundar companhias abertas brasileiras.
        </p>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#07110f] shadow-[0_34px_110px_-50px_rgba(7,18,15,0.72)]">
        <AnalysisRemotionPlayer />
      </div>
    </section>
  );
}
