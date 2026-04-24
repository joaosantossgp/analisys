"use client";

import dynamic from "next/dynamic";

import type { CompanyDirectoryItem } from "@/lib/api";

const DiscoverySection = dynamic(
  () =>
    import("@/components/home/discovery-section").then(
      (module) => module.DiscoverySection,
    ),
  {
    loading: () => (
      <section className="w-full max-w-5xl space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-full bg-muted/60" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-[1.25rem] border border-border/60 bg-card"
            />
          ))}
        </div>
      </section>
    ),
  },
);

type DiscoverySectionLazyProps = {
  popularesCompanies: CompanyDirectoryItem[];
  destaqueCompanies: CompanyDirectoryItem[];
};

export function DiscoverySectionLazy({
  popularesCompanies,
  destaqueCompanies,
}: DiscoverySectionLazyProps) {
  return (
    <DiscoverySection
      popularesCompanies={popularesCompanies}
      destaqueCompanies={destaqueCompanies}
    />
  );
}
