import test from "node:test";
import assert from "node:assert/strict";

import {
  isDesktopMode,
  bridgeFetchCompanies,
  bridgeFetchCompanyFilters,
  bridgeFetchCompanySuggestions,
  bridgeFetchCompanyInfo,
  bridgeFetchCompanyYears,
  bridgeFetchHealth,
  bridgeTrackCompanyView,
} from "../lib/desktop-bridge.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PyApi = NonNullable<NonNullable<typeof globalThis.window>["pywebview"]>["api"];

function withPywebview(api: Partial<PyApi>) {
  const win = globalThis as unknown as {
    window?: { pywebview?: { api: Partial<PyApi> } };
  };
  const prev = win.window;
  win.window = { pywebview: { api } };
  return () => {
    win.window = prev;
  };
}

// ---------------------------------------------------------------------------
// isDesktopMode
// ---------------------------------------------------------------------------

test("isDesktopMode returns false when window is undefined", () => {
  assert.equal(isDesktopMode(), false);
});

test("isDesktopMode returns true when window.pywebview is present", () => {
  const restore = withPywebview({ ping: async () => ({ pong: true, ts: 0 }) } as PyApi);
  try {
    assert.equal(isDesktopMode(), true);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanies — error envelope triggers BridgeError
// ---------------------------------------------------------------------------

test("bridgeFetchCompanies throws when bridge returns error envelope", async () => {
  const restore = withPywebview({
    get_companies: async () => ({ error: "db unavailable" }),
  } as unknown as PyApi);

  try {
    await assert.rejects(
      () => bridgeFetchCompanies({ page: 1, pageSize: 10 }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /db unavailable/);
        return true;
      },
    );
  } finally {
    restore();
  }
});

test("bridgeFetchCompanies returns data on success", async () => {
  const fakeResult = {
    items: [{ cd_cvm: 1, name: "Petro" }],
    pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 },
  };
  const restore = withPywebview({
    get_companies: async () => fakeResult,
  } as unknown as PyApi);

  try {
    const result = await bridgeFetchCompanies({ page: 1 });
    assert.deepEqual(result, fakeResult);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanyFilters
// ---------------------------------------------------------------------------

test("bridgeFetchCompanyFilters returns sectors list", async () => {
  const fake = { sectors: [{ slug: "energia", label: "Energia" }] };
  const restore = withPywebview({
    get_company_filters: async () => fake,
  } as unknown as PyApi);

  try {
    const result = await bridgeFetchCompanyFilters();
    assert.deepEqual(result, fake);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanySuggestions
// ---------------------------------------------------------------------------

test("bridgeFetchCompanySuggestions passes ready_only flag", async () => {
  let captured: Record<string, unknown> = {};
  const restore = withPywebview({
    get_company_suggestions: async (p: Record<string, unknown>) => {
      captured = p;
      return { items: [] };
    },
  } as unknown as PyApi);

  try {
    await bridgeFetchCompanySuggestions("petro", 5, { readyOnly: true });
    assert.equal(captured.q, "petro");
    assert.equal(captured.limit, 5);
    assert.equal(captured.ready_only, true);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanyInfo — not_found returns null
// ---------------------------------------------------------------------------

test("bridgeFetchCompanyInfo returns null when not_found", async () => {
  const restore = withPywebview({
    get_company_info: async () => ({ not_found: true }),
  } as unknown as PyApi);

  try {
    const result = await bridgeFetchCompanyInfo(12345);
    assert.equal(result, null);
  } finally {
    restore();
  }
});

test("bridgeFetchCompanyInfo returns company data on success", async () => {
  const fake = { cd_cvm: 9512, name: "Vale" };
  const restore = withPywebview({
    get_company_info: async () => fake,
  } as unknown as PyApi);

  try {
    const result = await bridgeFetchCompanyInfo(9512);
    assert.deepEqual(result, fake);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchCompanyYears
// ---------------------------------------------------------------------------

test("bridgeFetchCompanyYears returns years array", async () => {
  const restore = withPywebview({
    get_company_years: async () => ({ years: [2021, 2022, 2023] }),
  } as unknown as PyApi);

  try {
    const years = await bridgeFetchCompanyYears(9512);
    assert.deepEqual(years, [2021, 2022, 2023]);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchHealth
// ---------------------------------------------------------------------------

test("bridgeFetchHealth returns ok status", async () => {
  const fake = {
    status: "ok",
    version: "desktop",
    database_dialect: "sqlite",
    required_tables: [],
    warnings: [],
    errors: [],
  };
  const restore = withPywebview({
    get_health: async () => fake,
  } as unknown as PyApi);

  try {
    const result = await bridgeFetchHealth();
    assert.equal(result.status, "ok");
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeTrackCompanyView — fire-and-forget, no throw
// ---------------------------------------------------------------------------

test("bridgeTrackCompanyView is a no-op when not in desktop mode", () => {
  assert.doesNotThrow(() => bridgeTrackCompanyView(9512));
});
