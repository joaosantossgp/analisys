"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { CompanyDashboardModel } from "@/lib/company-dashboard";

const CompanyAnalysisPanel = dynamic(
  () =>
    import("@/components/company/company-analysis-panel").then(
      (module) => module.CompanyAnalysisPanel,
    ),
  {
    loading: () => (
      <div className="space-y-4 rounded-[1.75rem] border border-border/60 bg-background/82 p-6">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-muted/70" />
          <div className="h-8 w-72 animate-pulse rounded-full bg-muted/60" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/50" />
        </div>
        <div className="h-[320px] animate-pulse rounded-[1.25rem] border border-border/60 bg-muted/28" />
        <div className="h-52 animate-pulse rounded-[1.25rem] border border-border/60 bg-muted/20" />
      </div>
    ),
  },
);

type CompanyAnalysisPanelLazyProps = {
  model: CompanyDashboardModel;
  periodControl?: ReactNode;
};

export function CompanyAnalysisPanelLazy({
  model,
  periodControl,
}: CompanyAnalysisPanelLazyProps) {
  return <CompanyAnalysisPanel model={model} periodControl={periodControl} />;
}
