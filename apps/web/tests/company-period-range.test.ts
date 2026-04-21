import test from "node:test";
import assert from "node:assert/strict";

import {
  parseCompanyPeriodInput,
  resolveCompanyPeriodRange,
} from "../lib/company-period-range.ts";

test("parseCompanyPeriodInput accepts annual and quarterly formats", () => {
  assert.deepEqual(parseCompanyPeriodInput("2024"), {
    year: 2024,
    quarter: null,
  });
  assert.deepEqual(parseCompanyPeriodInput("2024T3"), {
    year: 2024,
    quarter: 3,
  });
  assert.deepEqual(parseCompanyPeriodInput("2024 2T"), {
    year: 2024,
    quarter: 2,
  });
  assert.deepEqual(parseCompanyPeriodInput("2024-q1"), {
    year: 2024,
    quarter: 1,
  });
});

test("resolveCompanyPeriodRange returns the inclusive annual range", () => {
  const result = resolveCompanyPeriodRange(
    [2020, 2021, 2022, 2023, 2024],
    "2021 3T",
    "2023T1",
  );

  assert.deepEqual(result, {
    ok: true,
    start: {
      year: 2021,
      quarter: 3,
    },
    end: {
      year: 2023,
      quarter: 1,
    },
    years: [2021, 2022, 2023],
  });
});

test("resolveCompanyPeriodRange rejects ranges outside the available years", () => {
  const result = resolveCompanyPeriodRange([2022, 2023, 2024], "2019", "2020");

  assert.deepEqual(result, {
    ok: false,
    error: "O intervalo precisa cobrir ao menos um ano disponível (2022-2024).",
  });
});

test("resolveCompanyPeriodRange rejects descending ranges", () => {
  const result = resolveCompanyPeriodRange([2022, 2023, 2024], "2024T4", "2024T1");

  assert.deepEqual(result, {
    ok: false,
    error: "O campo De: precisa ser anterior ou igual ao campo Até:.",
  });
});
