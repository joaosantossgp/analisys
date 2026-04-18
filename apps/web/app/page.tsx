import Link from "next/link";

import { CompanySearchHero } from "@/components/home/company-search-hero";
import { DiscoverySection } from "@/components/home/discovery-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/shared/design-system-recipes";
import { fetchCompanies, safeFetchHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [health, companySnapshot, topCompaniesResult] = await Promise.all([
    safeFetchHealth(),
    fetchCompanies({ page: 1, pageSize: 1 }).catch(() => null),
    fetchCompanies({ page: 1, pageSize: 8 }).catch(() => null),
  ]);

  const totalCompanies = companySnapshot?.pagination.total_items ?? null;
  const topCompanies = topCompaniesResult?.items ?? [];

  return (
    <PageShell density="relaxed" className="flex flex-col items-center gap-14 pb-20">
      <CompanySearchHero
        apiAvailable={health?.status === "ok"}
        totalCompanies={totalCompanies}
      />

      <TrustStrip health={health} totalCompanies={totalCompanies} />

      <DiscoverySection topCompanies={topCompanies} />

      {/* Compare CTA */}
      <div
        className="w-full max-w-5xl rounded-[1.75rem] border border-border/60 px-8 py-10 sm:px-12"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, var(--card)), var(--card))",
        }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-[520px]">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.26em] text-muted-foreground mb-2">
              Análise side-by-side
            </p>
            <h3 className="font-heading text-[1.75rem] font-medium tracking-[-0.035em] text-foreground leading-tight">
              Compare até 4 empresas.{" "}
              <span className="text-muted-foreground">Veja onde divergem.</span>
            </h3>
            <p className="mt-3 text-[0.95rem] leading-[1.55] text-muted-foreground">
              KPIs lado a lado, diferenças em destaque, períodos sincronizados.
            </p>
          </div>
          <Link
            href="/comparar"
            className={cn(
              buttonVariants({ size: "lg" }),
              "shrink-0 rounded-full px-6",
            )}
          >
            Comparar empresas
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
