import { CompanySearchHero } from "@/components/home/company-search-hero";
import { DiscoverySection } from "@/components/home/discovery-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { PageShell } from "@/components/shared/design-system-recipes";
import { fetchCompanies, safeFetchHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [health, companySnapshot, topCompaniesResult] = await Promise.all([
    safeFetchHealth(),
    fetchCompanies({ page: 1, pageSize: 1 }).catch(() => null),
    fetchCompanies({ page: 1, pageSize: 6 }).catch(() => null),
  ]);

  const totalCompanies = companySnapshot?.pagination.total_items ?? null;
  const topCompanies = topCompaniesResult?.items ?? [];

  return (
    <>
      <PageShell
        density="relaxed"
        className="pb-18 flex flex-col items-center text-center gap-12"
      >
        <CompanySearchHero
          apiAvailable={health?.status === "ok"}
          totalCompanies={totalCompanies}
        />

        <DiscoverySection topCompanies={topCompanies} />
      </PageShell>

      <TrustStrip health={health} totalCompanies={totalCompanies} />
    </>
  );
}
