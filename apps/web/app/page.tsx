import { CompanySearchHero } from "@/components/home/company-search-hero";
import { CtaSection } from "@/components/home/cta-section";
import { DiscoverySectionLazy } from "@/components/home/discovery-section-lazy";
import { FeaturesSection } from "@/components/home/features-section";
import { HeroSection } from "@/components/home/hero-section";
import { HomeTrustStrip } from "@/components/home/home-trust-strip";
import { WorkflowSection } from "@/components/home/workflow-section";
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
      {/* Hero with Brand Statement */}
      <HeroSection />

      {/* Search Bar */}
      <CompanySearchHero />

      {/* Trust Indicators */}
      <HomeTrustStrip totalCompanies={totalCompanies} />

      {/* Features Grid */}
      <FeaturesSection />

      {/* How It Works + Benefits */}
      <WorkflowSection />

      {/* Discovery Section */}
      <DiscoverySectionLazy topCompanies={topCompanies} />

      {/* Final CTA */}
      <CtaSection />
    </PageShell>
  );
}
