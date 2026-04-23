import { CompanyAnalysisPanel } from "@/components/company/company-analysis-panel";
import { CompanyContextCard } from "@/components/company/company-context-card";
import { CompanyFreshnessCard } from "@/components/company/company-freshness-card";
import { CompanyKpiRow } from "@/components/company/company-kpi-row";
import { SparklineChip } from "@/components/shared/sparkline-chip";
import type { CompanyInfo, KPIBundle } from "@/lib/api";
import { buildCompanyDashboardModel } from "@/lib/company-dashboard";
import { formatKpiValue } from "@/lib/formatters";

type CompanyOverviewProps = {
  company: CompanyInfo;
  bundle: KPIBundle;
  cdCvm: number;
  selectedYears: number[];
};

export function CompanyOverview({
  company,
  bundle,
  cdCvm,
  selectedYears,
}: CompanyOverviewProps) {
  const model = buildCompanyDashboardModel(bundle);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="flex flex-col gap-6 lg:col-span-8">
        <CompanyKpiRow cards={model.summaryCards} />
        <CompanyAnalysisPanel model={model} />
      </div>

      <div className="flex flex-col gap-4 lg:col-span-4">
        {model.spotlightMetrics.map((metric) => (
          <SparklineChip
            key={metric.id}
            label={metric.label}
            value={formatKpiValue(metric.value, metric.formatType)}
            delta={metric.delta}
            formatType={metric.formatType}
            values={metric.values}
          />
        ))}

        <CompanyFreshnessCard cdCvm={cdCvm} />
        <CompanyContextCard
          company={company}
          selectedYears={selectedYears}
          availableYears={model.years}
        />
      </div>
    </div>
  );
}
