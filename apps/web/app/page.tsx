import { BentoFeatures } from "@/components/home/bento-features";
import { CompanySearchHero } from "@/components/home/company-search-hero";
import { CtaSection } from "@/components/home/cta-section";
import { DiscoverySectionLazy } from "@/components/home/discovery-section-lazy";
import { StatsStrip } from "@/components/home/stats-strip";
import { PageShell } from "@/components/shared/design-system-recipes";
import { fetchCompanies } from "@/lib/api";
import { prioritizeDiscoveryCompanies } from "@/lib/company-discovery";

export const revalidate = 300;

export default async function HomePage() {
  const topCompaniesResult = await fetchCompanies({ page: 1, pageSize: 8 }).catch(
    () => null,
  );

  const totalCompanies = topCompaniesResult?.pagination.total_items ?? null;
  const topCompanies = prioritizeDiscoveryCompanies(
    topCompaniesResult?.items ?? [],
    8,
  );

  return (
    <PageShell density="relaxed" className="flex flex-col items-center gap-20 pb-24">
      {/* Hero with Search */}
      <CompanySearchHero />

      {/* Stats Strip */}
      <StatsStrip totalCompanies={totalCompanies} />

      {/* Bento Features Grid */}
      <BentoFeatures />

      {/* Discovery Section */}
      <DiscoverySectionLazy topCompanies={topCompanies} />

      {/* Compare CTA */}
      <CtaSection />
    </PageShell>
  );
}
