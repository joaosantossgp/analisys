import type { CompanyInfo, RefreshStatusItem } from "@/lib/api";

function normalizeStatus(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function hasReadableYearSignal(item: RefreshStatusItem): boolean {
  return (
    item.readable_years_count > 0 ||
    typeof item.latest_readable_year === "number"
  );
}

export function getReadableCompanyYears(
  company: CompanyInfo,
  availableYears: number[],
): number[] {
  const normalizedYears = Array.from(
    new Set(availableYears.filter((year) => Number.isInteger(year))),
  ).sort((a, b) => a - b);

  if (normalizedYears.length > 0) {
    return normalizedYears;
  }

  if (
    company.has_readable_current_data &&
    typeof company.latest_readable_year === "number"
  ) {
    return [company.latest_readable_year];
  }

  return [];
}

export function isReadableRefreshSuccess(
  item: RefreshStatusItem | null | undefined,
): boolean {
  if (!item?.has_readable_current_data || !hasReadableYearSignal(item)) {
    return false;
  }

  const trackingState = normalizeStatus(item.tracking_state);
  const latestOutcome = normalizeStatus(item.latest_attempt_outcome);
  const lastStatus = normalizeStatus(item.last_status);

  return (
    trackingState === "success" ||
    latestOutcome === "success" ||
    lastStatus === "success"
  );
}

export function getReadableRefreshSuccessKey(
  item: RefreshStatusItem | null | undefined,
): string | null {
  if (!item || !isReadableRefreshSuccess(item)) {
    return null;
  }

  return [
    item.cd_cvm,
    item.read_model_updated_at ??
      item.last_success_at ??
      item.finished_at ??
      item.updated_at ??
      "readable",
    item.latest_readable_year ?? "yearless",
    item.job_id ?? "no-job",
  ].join(":");
}
