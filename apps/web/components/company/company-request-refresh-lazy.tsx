"use client";

import dynamic from "next/dynamic";

import type { RefreshStatusItem } from "@/lib/api";

const CompanyRequestRefresh = dynamic(
  () =>
    import("@/components/company/company-request-refresh").then(
      (module) => module.CompanyRequestRefresh,
    ),
  {
    loading: () => (
      <div className="flex min-w-[18rem] flex-col gap-3 sm:max-w-xl">
        <div className="h-11 w-56 animate-pulse rounded-full bg-muted/60" />
      </div>
    ),
  },
);

type CompanyRequestRefreshLazyProps = {
  cdCvm: number;
  initialStatus?: RefreshStatusItem | null;
};

export function CompanyRequestRefreshLazy({
  cdCvm,
  initialStatus = null,
}: CompanyRequestRefreshLazyProps) {
  return (
    <CompanyRequestRefresh cdCvm={cdCvm} initialStatus={initialStatus} />
  );
}
