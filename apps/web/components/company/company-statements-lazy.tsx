"use client";

import dynamic from "next/dynamic";

import type { StatementMatrix } from "@/lib/api";

const CompanyStatements = dynamic(
  () =>
    import("@/components/company/company-statements").then(
      (module) => module.CompanyStatements,
    ),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-[1rem] bg-muted/45" />
        <div className="h-72 animate-pulse rounded-[1.25rem] border border-border/60 bg-card" />
      </div>
    ),
  },
);

type CompanyStatementsLazyProps = {
  matrix: StatementMatrix;
};

export function CompanyStatementsLazy({
  matrix,
}: CompanyStatementsLazyProps) {
  return <CompanyStatements matrix={matrix} />;
}
