"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon } from "lucide-react";

import type { CompanyDirectoryItem } from "@/lib/api";
import { SECTOR_COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Tab = "populares" | "destaque" | "setores";

const TABS: { id: Tab; label: string }[] = [
  { id: "populares", label: "Populares" },
  { id: "destaque", label: "Em destaque" },
  { id: "setores", label: "Setores" },
];

type DiscoverySectionProps = {
  topCompanies: CompanyDirectoryItem[];
};

export function DiscoverySection({ topCompanies }: DiscoverySectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("populares");

  return (
    <section className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-1 border-b border-border/60">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "populares" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {topCompanies.slice(0, 6).map((co) => (
            <Link
              key={co.cd_cvm}
              href={`/empresas/${co.cd_cvm}`}
              className="group flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 transition-colors hover:bg-muted/60 hover:border-border"
            >
              <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                {co.ticker_b3 ?? co.company_name}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {co.company_name}
              </span>
              {co.sector_name ? (
                <span className="mt-1 text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  {co.sector_name}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      {activeTab === "destaque" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topCompanies.slice(0, 4).map((co) => {
            const color =
              co.sector_name
                ? (SECTOR_COLOR[co.sector_name] ?? "#64748B")
                : "#64748B";
            return (
              <Link
                key={co.cd_cvm}
                href={`/empresas/${co.cd_cvm}`}
                className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-5 py-4 transition-colors hover:border-border"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                <div>
                  <p className="font-heading text-lg text-foreground">
                    {co.company_name}
                  </p>
                  {co.sector_name ? (
                    <p className="text-sm text-muted-foreground">
                      {co.sector_name}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-sm font-medium"
                    style={{ color }}
                  >
                    {co.ticker_b3 ?? `CVM ${co.cd_cvm}`}
                  </span>
                  <ArrowUpRightIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {activeTab === "setores" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(SECTOR_COLOR).map(([sector, color]) => (
            <Link
              key={sector}
              href="/setores"
              className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 transition-colors hover:bg-muted/60 hover:border-border"
            >
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-foreground">
                {sector}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
