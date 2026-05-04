import test from "node:test";
import assert from "node:assert/strict";

import {
  bridgeCheckUpdate,
  bridgeApplyUpdate,
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
// bridgeCheckUpdate
// ---------------------------------------------------------------------------

test("bridgeCheckUpdate returns available update from bridge", async () => {
  const restore = withPywebview({
    check_update: async () => ({ available: true, version: "0.2.0", url: "https://example.com/release" }),
  } as unknown as PyApi);
  try {
    const result = await bridgeCheckUpdate();
    assert.equal(result.available, true);
    assert.equal(result.version, "0.2.0");
  } finally {
    restore();
  }
});

test("bridgeCheckUpdate returns not-available from bridge", async () => {
  const restore = withPywebview({
    check_update: async () => ({ available: false, version: "", url: "" }),
  } as unknown as PyApi);
  try {
    const result = await bridgeCheckUpdate();
    assert.equal(result.available, false);
  } finally {
    restore();
  }
});

test("bridgeCheckUpdate throws when pywebview is not available", async () => {
  await assert.rejects(
    () => bridgeCheckUpdate(),
    (err: Error) => err.message.includes("pywebview.api indisponível"),
  );
});

test("bridgeCheckUpdate propagates bridge error envelope", async () => {
  const restore = withPywebview({
    check_update: async () => ({ error: "network_error" }),
  } as unknown as PyApi);
  try {
    await assert.rejects(
      () => bridgeCheckUpdate(),
      (err: Error) => err.message.includes("network_error"),
    );
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// bridgeApplyUpdate
// ---------------------------------------------------------------------------

test("bridgeApplyUpdate calls apply_update bridge method", async () => {
  let called = false;
  const restore = withPywebview({
    apply_update: async () => {
      called = true;
      return undefined;
    },
  } as unknown as PyApi);
  try {
    await bridgeApplyUpdate();
    assert.equal(called, true);
  } finally {
    restore();
  }
});

test("bridgeApplyUpdate throws when pywebview is not available", async () => {
  await assert.rejects(
    () => bridgeApplyUpdate(),
    (err: Error) => err.message.includes("pywebview.api indisponível"),
  );
});

test("bridgeApplyUpdate propagates bridge error envelope", async () => {
  const restore = withPywebview({
    apply_update: async () => ({ error: "apply_failed" }),
  } as unknown as PyApi);
  try {
    await assert.rejects(
      () => bridgeApplyUpdate(),
      (err: Error) => err.message.includes("apply_failed"),
    );
  } finally {
    restore();
  }
});
