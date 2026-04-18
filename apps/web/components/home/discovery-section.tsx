"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUpIcon, TrendingDownIcon, ArrowRightIcon } from "lucide-react";

import type { CompanyDirectoryItem } from "@/lib/api";
import { SECTOR_COLOR, getSectorColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Tab = "populares" | "destaque" | "setores";

const TABS: { id: Tab; label: string }[] = [
  { id: "populares", label: "Populares agora" },
  { id: "destaque", label: "Em destaque" },
  { id: "setores", label: "Setores" },
];

type DiscoverySectionProps = {
  topCompanies: CompanyDirectoryItem[];
};

function buildSparkPoints(anos: number[], W = 70, H = 32): string {
  if (!anos || anos.length < 2) return "";
  const sorted = [...anos].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const rangeYears = max - min || 1;
  return sorted
    .map((year, i) => {
      const x = ((year - min) / rangeYears) * W;
      const y = H - (i / Math.max(sorted.length - 1, 1)) * (H * 0.75) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function CompanyCard({ co }: { co: CompanyDirectoryItem }) {
  const color = getSectorColor(co.sector_name);
  const anos = co.anos_disponiveis ?? [];
  const sparkPts = buildSparkPoints(anos);

  return (
    <Link
      href={`/empresas/${co.cd_cvm}`}
      className="group flex flex-col gap-3 rounded-[1.25rem] border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_40px_-28px_rgba(16,30,24,0.22)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="mb-2 inline-block font-mono text-[0.7rem] font-medium px-1.5 py-0.5 rounded-[0.35rem]"
            style={{
              background: `color-mix(in oklch, ${color} 12%, transparent)`,
              border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
              color,
            }}
          >
            {co.ticker_b3 ?? `CVM ${co.cd_cvm}`}
          </div>
          <p className="font-semibold text-[0.95rem] text-foreground line-clamp-1">
            {co.company_name}
          </p>
          {co.sector_name && (
            <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{co.sector_name}</p>
          )}
        </div>
        {sparkPts && (
          <svg
            width={70}
            height={32}
            viewBox={`0 0 70 32`}
            className="shrink-0"
            aria-hidden
          >
            <defs>
              <linearGradient id={`spark-grad-${co.cd_cvm}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              points={sparkPts}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="flex items-end justify-between border-t border-dashed border-border/60 pt-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
            Dados disponíveis
          </p>
          <p className="mt-0.5 font-mono text-sm font-medium text-foreground tabular-nums">
            {anos.length > 0
              ? `${Math.min(...anos)}–${Math.max(...anos)}`
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[0.8rem] font-medium text-muted-foreground group-hover:text-primary transition-colors">
          <span>{anos.length} anos</span>
          <ArrowRightIcon className="size-3.5" />
        </div>
      </div>
    </Link>
  );
}

function DestaquCard({ co, rank }: { co: CompanyDirectoryItem; rank: number }) {
  const color = getSectorColor(co.sector_name);
  const anos = co.anos_disponiveis ?? [];
  const sparkPts = buildSparkPoints(anos, 54, 22);
  const isTop = rank < 3;

  return (
    <button
      type="button"
      onClick={() => window.location.assign(`/empresas/${co.cd_cvm}`)}
      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-accent/60"
    >
      <span className="w-5 shrink-0 font-mono text-[0.8rem] text-muted-foreground tabular-nums">
        {rank}
      </span>
      <span
        className="shrink-0 font-mono text-[0.7rem] font-medium px-1.5 py-0.5 rounded-[0.35rem]"
        style={{
          background: `color-mix(in oklch, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
          color,
        }}
      >
        {co.ticker_b3 ?? `${co.cd_cvm}`}
      </span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] text-foreground">
        {co.company_name}
      </span>
      {sparkPts && (
        <svg width={54} height={22} viewBox="0 0 54 22" aria-hidden className="shrink-0">
          <polyline
            points={sparkPts}
            fill="none"
            stroke={isTop ? "var(--chart-1)" : "var(--destructive)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span
        className="shrink-0 font-mono text-[0.82rem] font-medium tabular-nums"
        style={{ color: isTop ? "var(--chart-1)" : "var(--destructive)" }}
      >
        {anos.length} anos
      </span>
    </button>
  );
}

export function DiscoverySection({ topCompanies }: DiscoverySectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("populares");

  const topHalf = topCompanies.slice(0, Math.ceil(topCompanies.length / 2));
  const bottomHalf = topCompanies.slice(Math.ceil(topCompanies.length / 2));

  return (
    <section className="w-full max-w-5xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-muted-foreground mb-1">
            Descobrir
          </p>
          <h2 className="font-heading text-[2rem] font-medium leading-tight tracking-[-0.04em] text-foreground">
            Por onde começar
          </h2>
        </div>
        {/* Segmented control */}
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-all duration-150",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Populares */}
      {activeTab === "populares" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topCompanies.slice(0, 8).map((co) => (
            <CompanyCard key={co.cd_cvm} co={co} />
          ))}
        </div>
      )}

      {/* Em destaque — 2-col mover lists */}
      {activeTab === "destaque" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-border/60 bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-[color:var(--chart-1)]" />
              <span className="text-[0.95rem] font-semibold">Maior cobertura de dados</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {topHalf.map((co, i) => (
                <DestaquCard key={co.cd_cvm} co={co} rank={i + 1} />
              ))}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-border/60 bg-muted/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingDownIcon className="size-4 text-destructive" />
              <span className="text-[0.95rem] font-semibold">Outros destaques</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {bottomHalf.map((co, i) => (
                <DestaquCard key={co.cd_cvm} co={co} rank={i + 1} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Setores */}
      {activeTab === "setores" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(SECTOR_COLOR).map(([sector, color]) => (
            <Link
              key={sector}
              href={`/empresas?setor=${encodeURIComponent(sector)}`}
              className="group flex items-center gap-3 rounded-[1rem] border border-border/60 bg-card px-4 py-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-[12px]"
                style={{
                  background: `color-mix(in oklch, ${color} 14%, transparent)`,
                }}
              >
                <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.88rem] font-semibold text-foreground leading-tight">
                  {sector}
                </p>
                <p className="text-[0.72rem] text-muted-foreground mt-0.5">Ver empresas</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
