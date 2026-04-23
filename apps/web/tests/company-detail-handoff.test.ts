import test from "node:test";
import assert from "node:assert/strict";

import type { CompanyInfo, RefreshStatusItem } from "../lib/api.ts";
import {
  getReadableCompanyYears,
  getReadableRefreshSuccessKey,
  isReadableRefreshSuccess,
} from "../lib/company-detail-handoff.ts";

function buildCompanyInfo(overrides: Partial<CompanyInfo> = {}): CompanyInfo {
  return {
    cd_cvm: 9512,
    company_name: "PETROBRAS",
    nome_comercial: "Petrobras",
    cnpj: "33.000.167/0001-01",
    setor_cvm: "Energia",
    setor_analitico: "Energia",
    sector_name: "Energia",
    sector_slug: "energia",
    company_type: "comercial",
    ticker_b3: "PETR4",
    read_model_updated_at: null,
    has_readable_current_data: false,
    readable_years_count: 0,
    latest_readable_year: null,
    read_availability_code: null,
    read_availability_message: null,
    ...overrides,
  };
}

function buildRefreshStatusItem(
  overrides: Partial<RefreshStatusItem> = {},
): RefreshStatusItem {
  return {
    cd_cvm: 9512,
    company_name: "PETROBRAS",
    source_scope: "on_demand",
    job_id: "job-9512",
    stage: null,
    queue_position: null,
    last_attempt_at: "2026-04-21T12:00:00+00:00",
    last_success_at: "2026-04-21T12:05:00+00:00",
    last_status: "success",
    last_error: null,
    last_start_year: 2010,
    last_end_year: 2024,
    last_rows_inserted: 120,
    progress_current: null,
    progress_total: null,
    progress_message: null,
    started_at: "2026-04-21T12:00:00+00:00",
    heartbeat_at: "2026-04-21T12:04:00+00:00",
    finished_at: "2026-04-21T12:05:00+00:00",
    updated_at: "2026-04-21T12:05:01+00:00",
    read_model_updated_at: "2026-04-21T12:05:02+00:00",
    estimated_progress_pct: null,
    estimated_eta_seconds: null,
    estimated_total_seconds: null,
    elapsed_seconds: null,
    estimated_completion_at: null,
    estimate_confidence: null,
    tracking_state: "success",
    progress_mode: "none",
    is_retry_allowed: false,
    status_reason_code: "refresh_completed",
    status_reason_message: "Dados prontos para leitura nesta pagina.",
    has_readable_current_data: true,
    readable_years_count: 2,
    latest_readable_year: 2024,
    latest_attempt_outcome: "success",
    latest_attempt_reason_code: "refresh_completed",
    latest_attempt_reason_message: "Dados prontos para leitura nesta pagina.",
    latest_attempt_retryable: false,
    read_availability_code: "readable_history_available",
    read_availability_message: "Leitura anual disponivel ate 2024.",
    freshness_summary_code: "refresh_completed_readable",
    freshness_summary_message: "Dados prontos para leitura nesta pagina.",
    freshness_summary_severity: "success",
    source_label: "Base local materializada",
    ...overrides,
  };
}

test("getReadableCompanyYears keeps explicit years when the years endpoint is ready", () => {
  const years = getReadableCompanyYears(
    buildCompanyInfo({
      has_readable_current_data: true,
      readable_years_count: 2,
      latest_readable_year: 2024,
    }),
    [2024, 2023, 2024],
  );

  assert.deepEqual(years, [2023, 2024]);
});

test("getReadableCompanyYears falls back to company detail readable metadata", () => {
  const years = getReadableCompanyYears(
    buildCompanyInfo({
      has_readable_current_data: true,
      readable_years_count: 1,
      latest_readable_year: 2024,
    }),
    [],
  );

  assert.deepEqual(years, [2024]);
});

test("getReadableCompanyYears stays empty without a readable completion signal", () => {
  const years = getReadableCompanyYears(buildCompanyInfo(), []);

  assert.deepEqual(years, []);
});

test("isReadableRefreshSuccess requires terminal success and readable data", () => {
  assert.equal(isReadableRefreshSuccess(buildRefreshStatusItem()), true);
  assert.equal(
    isReadableRefreshSuccess(
      buildRefreshStatusItem({ has_readable_current_data: false }),
    ),
    false,
  );
  assert.equal(
    isReadableRefreshSuccess(
      buildRefreshStatusItem({
        tracking_state: "running",
        latest_attempt_outcome: "queued",
        last_status: "running",
      }),
    ),
    false,
  );
});

test("getReadableRefreshSuccessKey uses the read-model materialization stamp", () => {
  const key = getReadableRefreshSuccessKey(buildRefreshStatusItem());

  assert.equal(key, "9512:2026-04-21T12:05:02+00:00:2024:job-9512");
});
