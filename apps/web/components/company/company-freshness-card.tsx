import { CompanyRequestRefresh } from "@/components/company/company-request-refresh";

type CompanyFreshnessCardProps = {
  cdCvm: number;
};

export function CompanyFreshnessCard({ cdCvm }: CompanyFreshnessCardProps) {
  return (
    <div
      className="rounded-[1.25rem] border p-5"
      style={{
        borderColor: "color-mix(in oklch, var(--chart-1) 25%, transparent)",
        background: "color-mix(in oklch, var(--chart-1) 5%, var(--card))",
      }}
    >
      <p className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Atualização
      </p>
      <CompanyRequestRefresh cdCvm={cdCvm} />
    </div>
  );
}
