"use client";

import dynamic from "next/dynamic";

import type { CompanyHeroChartSeries } from "@/components/company/company-hero-chart";

const CompanyHeroChart = dynamic(
  () =>
    import("@/components/company/company-hero-chart").then(
      (module) => module.CompanyHeroChart,
    ),
  {
    loading: () => (
      <div className="rounded-[1.5rem] border border-border/60 bg-card px-6 py-6">
        <div className="h-7 w-56 animate-pulse rounded-full bg-muted/60" />
        <div className="mt-5 h-40 animate-pulse rounded-[1.25rem] bg-muted/45" />
      </div>
    ),
  },
);

type CompanyHeroChartLazyProps = {
  series: CompanyHeroChartSeries[];
};

export function CompanyHeroChartLazy({
  series,
}: CompanyHeroChartLazyProps) {
  return <CompanyHeroChart series={series} />;
}
