import test from "node:test";
import assert from "node:assert/strict";

import type { CompanyInfo, KPIBundle } from "../lib/api.ts";
import {
  buildCompanyDashboardModel,
  buildCompanyHeroModel,
} from "../lib/company-dashboard.ts";

function buildCompanyInfo(overrides: Partial<CompanyInfo> = {}): CompanyInfo {
  return {
    cd_cvm: 9512,
    company_name: "PETROLEO BRASILEIRO S.A. - PETROBRAS",
    nome_comercial: "Petrobras",
    cnpj: "33.000.167/0001-01",
    setor_cvm: "Energia",
    setor_analitico: "Energia",
    sector_name: "Energia",
    sector_slug: "energia",
    company_type: "comercial",
    ticker_b3: "PETR4",
    read_model_updated_at: null,
    has_readable_current_data: true,
    readable_years_count: 3,
    latest_readable_year: 2024,
    read_availability_code: "readable_history_available",
    read_availability_message: "Leitura anual disponivel ate 2024.",
    ...overrides,
  };
}

function buildBundle(): KPIBundle {
  return {
    cd_cvm: 9512,
    years: [2022, 2023, 2024],
    annual: {
      columns: [
        "KPI_ID",
        "KPI_NOME",
        "FORMAT_TYPE",
        "DELTA_YOY",
        "2022",
        "2023",
        "2024",
      ],
      rows: [
        {
          KPI_ID: "RECEITA_LIQ",
          KPI_NOME: "Receita Liquida",
          FORMAT_TYPE: "brl",
          DELTA_YOY: 0.08,
          2022: 1000,
          2023: 1100,
          2024: 1188,
        },
        {
          KPI_ID: "EBITDA",
          KPI_NOME: "EBITDA",
          FORMAT_TYPE: "brl",
          DELTA_YOY: 0.06,
          2022: 300,
          2023: 320,
          2024: 339,
        },
        {
          KPI_ID: "LUCRO_LIQ",
          KPI_NOME: "Lucro Liquido",
          FORMAT_TYPE: "brl",
          DELTA_YOY: 0.05,
          2022: 120,
          2023: 125,
          2024: 131,
        },
        {
          KPI_ID: "MG_BRUTA",
          KPI_NOME: "Margem Bruta",
          FORMAT_TYPE: "pct",
          DELTA_YOY: 0.01,
          2022: 0.42,
          2023: 0.43,
          2024: 0.44,
        },
        {
          KPI_ID: "MG_EBITDA",
          KPI_NOME: "Margem EBITDA",
          FORMAT_TYPE: "pct",
          DELTA_YOY: 0.015,
          2022: 0.28,
          2023: 0.295,
          2024: 0.31,
        },
        {
          KPI_ID: "MG_LIQ",
          KPI_NOME: "Margem Liquida",
          FORMAT_TYPE: "pct",
          DELTA_YOY: 0.01,
          2022: 0.12,
          2023: 0.125,
          2024: 0.135,
        },
        {
          KPI_ID: "ROE",
          KPI_NOME: "ROE",
          FORMAT_TYPE: "pct",
          DELTA_YOY: 0.02,
          2022: 0.17,
          2023: 0.18,
          2024: 0.2,
        },
        {
          KPI_ID: "DIV_LIQ_EBITDA",
          KPI_NOME: "Divida Liquida / EBITDA",
          FORMAT_TYPE: "ratio",
          DELTA_YOY: -0.1,
          2022: 1.4,
          2023: 1.3,
          2024: 1.2,
        },
      ],
    },
    quarterly: {
      columns: [],
      rows: [],
    },
  };
}

test("buildCompanyDashboardModel returns chart, cards and table models from annual KPIs", () => {
  const model = buildCompanyDashboardModel(buildBundle());

  assert.deepEqual(model.years, [2022, 2023, 2024]);
  assert.equal(model.yearsLabel, "2022, 2023, 2024");
  assert.ok(model.indicatorOptions.some((indicator) => indicator.id === "RECEITA_LIQ"));
  assert.deepEqual(
    model.defaultSelectedIndicators.map((indicator) => indicator.id),
    ["RECEITA_LIQ", "EBITDA", "LUCRO_LIQ"],
  );
  assert.deepEqual(
    model.summaryCards.map((card) => card.id),
    ["MG_BRUTA", "MG_EBITDA", "MG_LIQ", "ROE"],
  );
  assert.deepEqual(
    model.spotlightMetrics.map((metric) => metric.id),
    ["RECEITA_LIQ", "EBITDA", "LUCRO_LIQ", "MG_EBITDA"],
  );
  assert.equal(model.chartSeries.RECEITA_LIQ.points.at(-1)?.value, 1188);
  assert.equal(
    model.tableRows.find((row) => row.id === "DIV_LIQ_EBITDA")?.valuesByYear[2024],
    1.2,
  );
});

test("buildCompanyHeroModel keeps compare and sector links aligned with selected years", () => {
  const hero = buildCompanyHeroModel(buildCompanyInfo(), [2023, 2024]);

  assert.equal(hero.initials, "PB");
  assert.match(hero.compareHref, /\/comparar\?ids=9512&anos=2023%2C2024/);
  assert.equal(hero.sectorHref, "/setores/energia?ano=2024");
});
