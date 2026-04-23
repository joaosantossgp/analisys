import test from "node:test";
import assert from "node:assert/strict";

import type { CompanyDirectoryItem } from "../lib/api.ts";
import {
  getCompanyAvailability,
  prioritizeDiscoveryCompanies,
  selectReadyCompareCompanies,
} from "../lib/company-discovery.ts";

function buildCompany(
  cdCvm: number,
  overrides: Partial<CompanyDirectoryItem> = {},
): CompanyDirectoryItem {
  return {
    cd_cvm: cdCvm,
    company_name: `Empresa ${cdCvm}`,
    ticker_b3: `T${cdCvm}`,
    setor_analitico: "Energia",
    setor_cvm: "Energia",
    sector_name: "Energia",
    sector_slug: "energia",
    has_financial_data: true,
    coverage_rank: 1,
    anos_disponiveis: [2023, 2024],
    total_rows: 120,
    ...overrides,
  };
}

test("getCompanyAvailability marks strong local history as ready", () => {
  const state = getCompanyAvailability(buildCompany(1), { referenceYear: 2026 });

  assert.equal(state.kind, "ready");
  assert.equal(state.badge, "Pronta agora");
  assert.equal(state.yearsLabel, "2023-2024");
  assert.equal(state.compareEligible, true);
});

test("getCompanyAvailability marks empty local history as requestable", () => {
  const state = getCompanyAvailability(
    buildCompany(2, {
      has_financial_data: false,
      anos_disponiveis: [],
      total_rows: 0,
      coverage_rank: null,
    }),
    { referenceYear: 2026 },
  );

  assert.equal(state.kind, "requestable");
  assert.equal(state.summary, "Carga on-demand");
  assert.equal(state.compareEligible, false);
});

test("getCompanyAvailability distinguishes low signal local coverage", () => {
  const state = getCompanyAvailability(
    buildCompany(3, {
      anos_disponiveis: [2024],
      total_rows: 120,
    }),
    { referenceYear: 2026 },
  );

  assert.equal(state.kind, "low_signal");
  assert.equal(state.badge, "Baixo sinal");
});

test("getCompanyAvailability flags stale local history as stalled", () => {
  const state = getCompanyAvailability(
    buildCompany(4, {
      anos_disponiveis: [2020, 2021],
      total_rows: 120,
    }),
    { referenceYear: 2026 },
  );

  assert.equal(state.kind, "stalled");
  assert.equal(state.summary, "Historico antigo");
});

test("prioritizeDiscoveryCompanies keeps strong entries ahead of weak suggestions", () => {
  const items = [
    buildCompany(4, { anos_disponiveis: [2020, 2021], total_rows: 120 }),
    buildCompany(2, {
      has_financial_data: false,
      anos_disponiveis: [],
      total_rows: 0,
      coverage_rank: null,
    }),
    buildCompany(3, { anos_disponiveis: [2024], total_rows: 120 }),
    buildCompany(1),
  ];

  const orderedIds = prioritizeDiscoveryCompanies(items).map((item) => item.cd_cvm);

  assert.deepEqual(orderedIds, [1, 2, 3, 4]);
});

test("selectReadyCompareCompanies only returns companies eligible for compare", () => {
  const result = selectReadyCompareCompanies([
    buildCompany(1),
    buildCompany(2, { anos_disponiveis: [2024], total_rows: 120 }),
    buildCompany(3, {
      has_financial_data: false,
      anos_disponiveis: [],
      total_rows: 0,
      coverage_rank: null,
    }),
  ]);

  assert.deepEqual(result.map((item) => item.cd_cvm), [1]);
});
