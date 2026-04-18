import { CompanyRequestRefresh } from "@/components/company/company-request-refresh";
import { SurfaceCard } from "@/components/shared/design-system-recipes";

type CompanyFreshnessCardProps = {
  cdCvm: number;
};

export function CompanyFreshnessCard({ cdCvm }: CompanyFreshnessCardProps) {
  return (
    <SurfaceCard tone="inset" padding="md">
      <p className="eyebrow mb-3 text-muted-foreground">Atualização</p>
      <CompanyRequestRefresh cdCvm={cdCvm} />
    </SurfaceCard>
  );
}
