import test from "node:test";
import assert from "node:assert/strict";

import {
  ApiClientError,
  fetchCompanies,
  fetchCompanyFilters,
  fetchCompanyFreshness,
  fetchCompanyKpis,
  fetchCompanyStatement,
  fetchCompanySuggestions,
  fetchCompanyYears,
  fetchRequestRefresh,
  fetchSectorDetail,
  fetchRefreshStatus,
  getUserFacingErrorCopy,
} from "../lib/api.ts";
import { getFilenameFromDisposition } from "../lib/download-file.ts";

type FetchMock = typeof globalThis.fetch;

function withFetchMock(mock: FetchMock) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("fetchCompanies wraps transport failures into a stable network error", async () => {
  const restore = withFetchMock((async () => {
    throw new TypeError("fetch failed");
  }) as FetchMock);

  try {
    await assert.rejects(
      () => fetchCompanies({ page: 1, pageSize: 20 }),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.code, "network_error");
        assert.equal(error.status, 503);

        const copy = getUserFacingErrorCopy(error);
        assert.equal(copy.title, "API indisponivel");
        assert.match(copy.message, /Nao foi possivel conectar a API da V2/i);
        return true;
      },
    );
  } finally {
    restore();
  }
});

test("fetchCompanyFilters maps upstream 5xx responses to upstream_unavailable", async () => {
  const restore = withFetchMock((async () =>
    new Response(
      JSON.stringify({
        error: {
          code: "service_unavailable",
          message: "Falha operacional ao processar a requisicao.",
        },
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as FetchMock);

  try {
    await assert.rejects(
      () => fetchCompanyFilters(),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.code, "upstream_unavailable");
        assert.equal(error.status, 503);
        return true;
      },
    );
  } finally {
    restore();
  }
});

test("fetchCompanyFilters opts into the backend-aligned revalidate window", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(
      JSON.stringify({
        sectors: [],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as FetchMock);

  try {
    await fetchCompanyFilters();

    assert.equal(capturedInit?.cache, undefined);
    assert.deepEqual(capturedInit?.next, { revalidate: 3600 });
  } finally {
    restore();
  }
});

test("fetchCompanySuggestions opts into the backend-aligned revalidate window", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(
      JSON.stringify({
        items: [],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as FetchMock);

  try {
    await fetchCompanySuggestions("itub4", 6);

    assert.equal(capturedInit?.cache, undefined);
    assert.deepEqual(capturedInit?.next, { revalidate: 60 });
  } finally {
    restore();
  }
});

test("fetchCompanies opts into the backend-aligned revalidate window", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(
      JSON.stringify({
        items: [],
        pagination: {
          page: 1,
          page_size: 20,
          total_items: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
        applied_filters: {
          search: "",
          sector: null,
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as FetchMock);

  try {
    await fetchCompanies({ page: 1, pageSize: 20 });

    assert.equal(capturedInit?.cache, undefined);
    assert.deepEqual(capturedInit?.next, { revalidate: 300 });
  } finally {
    restore();
  }
});

test("fetchSectorDetail opts into the backend-aligned revalidate window", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(
      JSON.stringify({
        sector_name: "Energia",
        sector_slug: "energia",
        company_count: 1,
        available_years: [2023, 2024],
        selected_year: 2024,
        yearly_overview: [
          { year: 2024, roe: 0.18, mg_ebit: 0.22, mg_liq: 0.14 },
        ],
        companies: [
          {
            cd_cvm: 9512,
            company_name: "PETROBRAS",
            ticker_b3: "PETR4",
            roe: 0.25,
            mg_ebit: 0.28,
            mg_liq: 0.17,
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as FetchMock);

  try {
    await fetchSectorDetail("energia", 2024);

    assert.equal(capturedInit?.cache, undefined);
    assert.deepEqual(capturedInit?.next, { revalidate: 3600 });
  } finally {
    restore();
  }
});

test("fetchCompanies rejects invalid payload shapes as invalid_response", async () => {
  const restore = withFetchMock((async () =>
    new Response(
      JSON.stringify({
        items: [],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as FetchMock);

  try {
    await assert.rejects(
      () => fetchCompanies({ page: 1, pageSize: 20 }),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.code, "invalid_response");
        assert.equal(error.status, 200);

        const copy = getUserFacingErrorCopy(error);
        assert.equal(copy.title, "Resposta invalida da API");
        return true;
      },
    );
  } finally {
    restore();
  }
});

test("fetchRefreshStatus keeps explicit no-store semantics for polling flows", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }) as FetchMock);

  try {
    await fetchRefreshStatus(1234);

    assert.equal(capturedInit?.cache, "no-store");
  } finally {
    restore();
  }
});

test("fetchCompanyYears allows an explicit no-store override for company detail refreshes", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(JSON.stringify([2024]), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }) as FetchMock);

  try {
    const payload = await fetchCompanyYears(4170, {
      request: { cache: "no-store" },
    });

    assert.deepEqual(payload, [2024]);
    assert.equal(capturedInit?.cache, "no-store");
    assert.equal(capturedInit?.next, undefined);
  } finally {
    restore();
  }
});

test("fetchCompanyKpis allows an explicit no-store override for company detail refreshes", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(
      JSON.stringify({
        cd_cvm: 4170,
        years: [2024],
        annual: {
          columns: [],
          rows: [],
        },
        quarterly: {
          columns: [],
          rows: [],
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as FetchMock);

  try {
    const payload = await fetchCompanyKpis(4170, [2024], {
      request: { cache: "no-store" },
    });

    assert.equal(payload.cd_cvm, 4170);
    assert.equal(capturedInit?.cache, "no-store");
    assert.equal(capturedInit?.next, undefined);
  } finally {
    restore();
  }
});

test("fetchCompanyStatement allows an explicit no-store override for company detail refreshes", async () => {
  let capturedInit: RequestInit | undefined;
  const restore = withFetchMock((async (_input, init) => {
    capturedInit = init;

    return new Response(
      JSON.stringify({
        cd_cvm: 4170,
        statement_type: "DRE",
        years: [2024],
        table: {
          columns: [],
          rows: [],
        },
        exclude_conflicts: false,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as FetchMock);

  try {
    const payload = await fetchCompanyStatement(4170, [2024], "DRE", {
      request: { cache: "no-store" },
    });

    assert.equal(payload.statement_type, "DRE");
    assert.equal(capturedInit?.cache, "no-store");
    assert.equal(capturedInit?.next, undefined);
  } finally {
    restore();
  }
});

test("fetchRequestRefresh accepts the new internal queue payload", async () => {
  const restore = withFetchMock((async () =>
    new Response(
      JSON.stringify({
        cd_cvm: 4170,
        status: "queued",
        job_id: "job-4170",
        accepted_at: "2026-04-21T12:00:00+00:00",
        message: "Solicitacao enfileirada para processamento interno.",
      }),
      {
        status: 202,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as FetchMock);

  try {
    const payload = await fetchRequestRefresh(4170);

    assert.equal(payload.status, "queued");
    assert.equal(payload.job_id, "job-4170");
    assert.equal(payload.accepted_at, "2026-04-21T12:00:00+00:00");
  } finally {
    restore();
  }
});

test("fetchRefreshStatus accepts estimated progress fields from the API", async () => {
  const restore = withFetchMock((async () =>
    new Response(
      JSON.stringify([
        {
          cd_cvm: 4170,
          company_name: "VALE",
          source_scope: "on_demand",
          job_id: "job-4170",
          stage: "download_extract",
          queue_position: 2,
          last_attempt_at: "2026-04-21T12:00:00+00:00",
          last_success_at: null,
          last_status: "queued",
          last_error: null,
          last_start_year: 2010,
          last_end_year: 2024,
          last_rows_inserted: null,
          progress_current: 9,
          progress_total: 20,
          progress_message: "Download concluido para DFP/2018.",
          started_at: "2026-04-21T12:00:00+00:00",
          heartbeat_at: "2026-04-21T12:04:00+00:00",
          finished_at: null,
          updated_at: "2026-04-21T12:00:00+00:00",
          estimated_progress_pct: 31.4,
          estimated_eta_seconds: 840,
          estimated_total_seconds: 1260,
          elapsed_seconds: 420,
          estimated_completion_at: "2026-04-21T12:21:00+00:00",
          estimate_confidence: "medium",
        },
      ]),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as FetchMock);

  try {
    const payload = await fetchRefreshStatus(4170);

    assert.equal(payload[0]?.job_id, "job-4170");
    assert.equal(payload[0]?.stage, "download_extract");
    assert.equal(payload[0]?.queue_position, 2);
    assert.equal(payload[0]?.progress_current, 9);
    assert.equal(payload[0]?.progress_total, 20);
    assert.equal(payload[0]?.estimated_progress_pct, 31.4);
    assert.equal(payload[0]?.estimated_eta_seconds, 840);
    assert.equal(payload[0]?.estimate_confidence, "medium");
  } finally {
    restore();
  }
});

test("fetchRefreshStatus normalizes missing estimate fields from legacy payloads", async () => {
  const restore = withFetchMock((async () =>
    new Response(
      JSON.stringify([
        {
          cd_cvm: 4170,
          company_name: "VALE",
          source_scope: "on_demand",
          last_attempt_at: "2026-04-21T12:00:00+00:00",
          last_success_at: null,
          last_status: "queued",
          last_error: null,
          last_start_year: 2010,
          last_end_year: 2024,
          last_rows_inserted: null,
          updated_at: "2026-04-21T12:00:00+00:00",
        },
      ]),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as FetchMock);

  try {
    const payload = await fetchRefreshStatus(4170);

    assert.equal(payload[0]?.job_id, null);
    assert.equal(payload[0]?.stage, null);
    assert.equal(payload[0]?.queue_position, null);
    assert.equal(payload[0]?.progress_current, null);
    assert.equal(payload[0]?.progress_total, null);
    assert.equal(payload[0]?.estimated_progress_pct, null);
    assert.equal(payload[0]?.estimated_eta_seconds, null);
    assert.equal(payload[0]?.estimated_total_seconds, null);
    assert.equal(payload[0]?.elapsed_seconds, null);
    assert.equal(payload[0]?.estimated_completion_at, null);
    assert.equal(payload[0]?.estimate_confidence, null);
  } finally {
    restore();
  }
});

test("fetchCompanyFreshness normalizes missing estimate fields from legacy API payloads", async () => {
  const restore = withFetchMock((async () =>
    new Response(
      JSON.stringify([
        {
          cd_cvm: 4170,
          company_name: "VALE",
          source_scope: "on_demand",
          last_attempt_at: "2026-04-21T12:00:00+00:00",
          last_success_at: null,
          last_status: "queued",
          last_error: null,
          last_start_year: 2010,
          last_end_year: 2024,
          last_rows_inserted: null,
          updated_at: "2026-04-21T12:00:00+00:00",
        },
      ]),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as FetchMock);

  try {
    const payload = await fetchCompanyFreshness(4170);

    assert.equal(payload?.job_id, null);
    assert.equal(payload?.stage, null);
    assert.equal(payload?.estimated_progress_pct, null);
    assert.equal(payload?.estimated_eta_seconds, null);
    assert.equal(payload?.estimate_confidence, null);
  } finally {
    restore();
  }
});

test("getFilenameFromDisposition keeps quoted filenames when present", () => {
  const filename = getFilenameFromDisposition(
    'attachment; filename="PETR4_20260409.xlsx"',
    "fallback.xlsx",
  );

  assert.equal(filename, "PETR4_20260409.xlsx");
});

test("getFilenameFromDisposition falls back when header is missing", () => {
  const filename = getFilenameFromDisposition(null, "fallback.xlsx");

  assert.equal(filename, "fallback.xlsx");
});
