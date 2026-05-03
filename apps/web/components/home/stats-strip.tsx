"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type StatItemProps = {
  value: number;
  suffix?: string;
  label: string;
};

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const startTime = performance.now();

          function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(eased * value));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tnum">
      {displayValue.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

function StatItem({ value, suffix, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4">
      <span className="font-heading text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight text-foreground">
        <AnimatedNumber value={value} suffix={suffix} />
      </span>
      <span className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

type StatsStripProps = {
  totalCompanies: number | null;
};

export function StatsStrip({ totalCompanies }: StatsStripProps) {
  const stats = [
    { value: totalCompanies ?? 800, suffix: "+", label: "Empresas" },
    { value: 10, suffix: "+", label: "Anos de historico" },
    { value: 60, suffix: "+", label: "KPIs calculados" },
    { value: 100, suffix: "%", label: "Dados publicos" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-border/60",
          "bg-gradient-to-br from-card via-card to-muted/30"
        )}
      >
        {/* Subtle pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(33,39,33,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(33,39,33,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />
        
        <div className="relative grid grid-cols-2 divide-x divide-border/40 md:grid-cols-4">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
