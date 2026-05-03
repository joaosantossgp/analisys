import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchBatchRefresh,
  fetchBatchJobStatus,
  cancelBatchJob,
} from "../lib/api.ts";
import {
  bridgeRequestBatchRefresh,
  bridgeFetchBatchStatus,
  bridgeCancelRefresh,
} from "../lib/desktop-bridge.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchMock = typeof globalThis.fetch;

function withFetchMock(mock: FetchMock) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

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
// fetchBatchRefresh — web mode
// ---------------------------------------------------------------------------

test("fetchBatchRefresh (web) posts to /api/refresh-batch and returns dispatch response", async () => {
  const dispatch = {
    status: "running",
    job_id: "abc123",
    queued: 5,
    message: "Refresh iniciado em background.",
    is_retry_allowed: false,
  };

  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody: unknown = null;

  const restore = withFetchMock((async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = typeof input === "string" ? input : String(input);
    capturedMethod = init?.method ?? "GET";
    capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
    return new Response(JSON.stringify(dispatch), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as FetchMock);

  try {
    const result = await fetchBatchRefresh({ mode: "missing" });
    assert.ok(capturedUrl.endsWith("/api/refresh-batch"), `unexpected url: ${capturedUrl}`);
    assert.equal(capturedMethod, "POST");
    assert.equal((capturedBody as { mode: string }).mode, "missing");
    assert.equal(result.status, "running");
    assert.equal(result.job_id, "abc123");
    assert.equal(result.queued, 5);
  } finally {
    restore();
  }
});

test("fetchBatchRefresh (web) passes filters in the request body", async () => {
  let capturedBody: Record<string, unknown> = {};

  const restore = withFetchMock((async (_: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    return new Response(
      JSON.stringify({ status: "queued", job_id: "x", queued: 2, message: "ok", is_retry_allowed: false }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as FetchMock);

  try {
    await fetchBatchRefresh({
      mode: "outdated",
      sector: "Financeiro",
      statusFilter: "failed",
      cvmFrom: 100,
      cvmTo: 999,
    });
    assert.equal(capturedBody.mode, "outdated");
    assert.equal(capturedBody.sector, "Financeiro");
    assert.equal(capturedBody.status_filter, "failed");
    assert.equal(capturedBody.cvm_from, 100);
    assert.equal(capturedBody.cvm_to, 999);
  } finally {
    restore();
  }
});

test("fetchBatchRefresh (web) throws on network failure", async () => {
  const restore = withFetchMock((async () => {
    throw new TypeError("fetch failed");
  }) as FetchMock);

  try {
    await assert.rejects(() => fetchBatchRefresh({ mode: "full" }));
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// fetchBatchJobStatus — web mode
// ---------------------------------------------------------------------------

test("fetchBatchJobStatus (web) fetches from /api/refresh-jobs/:id", async () => {
  const jobStatus = {
    job_id: "abc123",
    state: "running",
    queued: 10,
    processed: 3,
    failures: 0,
    current_cvm: 9512,
    log_lines: ["Baixando PETROBRAS", "Processando PETROBRAS"],
  };

  let capturedUrl = "";
  const restore = withFetchMock((async (input: RequestInfo | URL) => {
    capturedUrl = typeof input === "string" ? input : String(input);
    return new Response(JSON.stringify(jobStatus), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as FetchMock);

  try {
    const result = await fetchBatchJobStatus("abc123");
    assert.ok(capturedUrl.includes("/api/refresh-jobs/abc123"), `unexpected url: ${capturedUrl}`);
    assert.equal(result.state, "running");
    assert.equal(result.processed, 3);
    assert.equal(result.current_cvm, 9512);
    assert.deepEqual(result.log_lines, jobStatus.log_lines);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// cancelBatchJob — web mode (no-op)
// ---------------------------------------------------------------------------

test("cancelBatchJob (web) returns ok without making a network request", async () => {
  let fetchCalled = false;
  const restore = withFetchMock((async () => {
    fetchCalled = true;
    return new Response("{}", { status: 200 });
  }) as FetchMock);

  try {
    const result = await cancelBatchJob("any-job-id");
    assert.equal(result.ok, true);
    assert.equal(fetchCalled, false);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeRequestBatchRefresh — desktop mode
// ---------------------------------------------------------------------------

test("bridgeRequestBatchRefresh calls request_refresh with mode param", async () => {
  let capturedParams: Record<string, unknown> = {};
  const dispatchResponse = {
    status: "running",
    job_id: "bridge-job-1",
    queued: 449,
    message: "ok",
    is_retry_allowed: false,
  };

  const restore = withPywebview({
    request_refresh: async (params: Record<string, unknown>) => {
      capturedParams = params;
      return dispatchResponse;
    },
  } as unknown as PyApi);

  try {
    const result = await bridgeRequestBatchRefresh({ mode: "full" });
    assert.equal(capturedParams.mode, "full");
    assert.equal(result.status, "running");
    assert.equal(result.job_id, "bridge-job-1");
  } finally {
    restore();
  }
});

test("bridgeRequestBatchRefresh passes optional filters", async () => {
  let capturedParams: Record<string, unknown> = {};

  const restore = withPywebview({
    request_refresh: async (params: Record<string, unknown>) => {
      capturedParams = params;
      return { status: "queued", job_id: "j", queued: 1, message: "ok", is_retry_allowed: false };
    },
  } as unknown as PyApi);

  try {
    await bridgeRequestBatchRefresh({
      mode: "missing",
      sector: "Energia Eletrica",
      cvmFrom: 200,
    });
    assert.equal(capturedParams.sector, "Energia Eletrica");
    assert.equal(capturedParams.cvm_from, 200);
    assert.equal("cvm_to" in capturedParams, false);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeFetchBatchStatus — desktop mode
// ---------------------------------------------------------------------------

test("bridgeFetchBatchStatus calls get_refresh_status with job_id", async () => {
  let capturedParams: Record<string, unknown> = {};
  const statusResponse = {
    job_id: "bridge-job-1",
    state: "success",
    queued: 10,
    processed: 10,
    failures: 1,
    log_lines: ["Done"],
  };

  const restore = withPywebview({
    get_refresh_status: async (params?: Record<string, unknown>) => {
      capturedParams = params ?? {};
      return statusResponse;
    },
  } as unknown as PyApi);

  try {
    const result = await bridgeFetchBatchStatus("bridge-job-1");
    assert.equal(capturedParams.job_id, "bridge-job-1");
    assert.equal(result.state, "success");
    assert.equal(result.processed, 10);
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeCancelRefresh — desktop mode
// ---------------------------------------------------------------------------

test("bridgeCancelRefresh calls cancel_refresh with job_id", async () => {
  let capturedParams: Record<string, unknown> = {};

  const restore = withPywebview({
    cancel_refresh: async (params: Record<string, unknown>) => {
      capturedParams = params;
      return { ok: true, message: "Cancelamento solicitado." };
    },
  } as unknown as PyApi);

  try {
    const result = await bridgeCancelRefresh("bridge-job-1");
    assert.equal(capturedParams.job_id, "bridge-job-1");
    assert.equal(result.ok, true);
  } finally {
    restore();
  }
});

test("bridgeCancelRefresh throws on bridge error envelope", async () => {
  const restore = withPywebview({
    cancel_refresh: async () => ({ error: "job not found" }),
  } as unknown as PyApi);

  try {
    await assert.rejects(
      () => bridgeCancelRefresh("no-such-job"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /job not found/);
        return true;
      },
    );
  } finally {
    restore();
  }
});
