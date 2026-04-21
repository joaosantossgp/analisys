import test from "node:test";
import assert from "node:assert/strict";

import type { RefreshStatusItem } from "../lib/api.ts";
import {
  applyRefreshPollFailure,
  applyRefreshStatusResult,
  createDelayedRefreshState,
  createDispatchedRefreshState,
  getNextPollingDelayMs,
  getReconnectDelayMs,
  getRefreshViewModel,
  hasRefreshTimedOut,
  hydrateRefreshState,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
} from "../lib/company-refresh-state.ts";

function buildRefreshStatusItem(
  overrides: Partial<RefreshStatusItem> = {},
): RefreshStatusItem {
  return {
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
    estimated_progress_pct: null,
    estimated_eta_seconds: null,
    estimated_total_seconds: null,
    elapsed_seconds: null,
    estimated_completion_at: null,
    estimate_confidence: null,
    ...overrides,
  };
}

test("hydrateRefreshState starts in idle without an active refresh", () => {
  const state = hydrateRefreshState(null, Date.now());

  assert.equal(state.phase, "idle");

  const view = getRefreshViewModel(state);
  assert.equal(view.showCard, false);
  assert.equal(view.requestButtonDisabled, false);
});

test("hydrateRefreshState restores a queued refresh from server data", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({ last_status: "queued" }),
    Date.now(),
  );

  assert.equal(state.phase, "queued");
  assert.equal(state.lastKnownActiveItem?.last_status, "queued");
});

test("hydrateRefreshState restores a running refresh from server data", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "running",
      estimated_progress_pct: 48.5,
    }),
    Date.now(),
  );

  assert.equal(state.phase, "running");
  assert.equal(state.lastKnownActiveItem?.estimated_progress_pct, 48.5);
});

test("terminal backend statuses map to the destructive terminal error state", () => {
  const state = applyRefreshStatusResult(
    createDispatchedRefreshState(Date.now()),
    buildRefreshStatusItem({
      last_status: "error",
      last_error: "Falha operacional ao atualizar a companhia.",
    }),
    Date.now(),
  );

  assert.equal(state.phase, "terminal_error");

  const view = getRefreshViewModel(state);
  assert.equal(view.isDestructive, true);
  assert.equal(
    view.message,
    "Falha operacional ao atualizar a companhia.",
  );
});

test("low-confidence estimates hide the exact completion clock", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "running",
      estimated_progress_pct: 41.2,
      estimated_eta_seconds: 840,
      estimated_total_seconds: 1260,
      elapsed_seconds: 420,
      estimated_completion_at: "2026-04-21T12:21:00+00:00",
      estimate_confidence: "low",
    }),
    Date.now(),
  );

  const view = getRefreshViewModel(state);

  assert.equal(view.estimate?.confidenceLabel, "Estimativa inicial.");
  assert.equal(view.estimate?.completionLabel, undefined);
  assert.equal(view.estimate?.etaLabel, "~14 min restantes");
});

test("missing estimate fields fall back without breaking the progress UI", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "running",
      estimated_progress_pct: null,
      estimated_eta_seconds: null,
      estimated_total_seconds: null,
      elapsed_seconds: null,
      estimated_completion_at: null,
      estimate_confidence: null,
    }),
    Date.now(),
  );

  const view = getRefreshViewModel(state);

  assert.equal(view.estimate?.etaLabel, "Estimativa ainda indisponivel");
  assert.equal(view.estimate?.progress, 42);
});

test("transient poll failures preserve the last known progress and enter reconnecting", () => {
  const activeState = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "running",
      estimated_progress_pct: 67,
    }),
    Date.now(),
  );
  const nextState = applyRefreshPollFailure(activeState);

  assert.equal(nextState.phase, "reconnecting");
  assert.equal(nextState.failureCount, 1);

  const view = getRefreshViewModel(nextState);
  assert.equal(view.message, "Conexao instavel. Tentando reconectar...");
  assert.equal(view.estimate?.progress, 67);
});

test("reconnect delays back off and cap at sixty seconds", () => {
  assert.equal(getReconnectDelayMs(1), 10_000);
  assert.equal(getReconnectDelayMs(2), 20_000);
  assert.equal(getReconnectDelayMs(3), 30_000);
  assert.equal(getReconnectDelayMs(4), 60_000);
  assert.equal(getReconnectDelayMs(7), 60_000);
});

test("successful recovery from reconnecting restores the active phase and normal cadence", () => {
  const reconnectingState = applyRefreshPollFailure(
    hydrateRefreshState(
      buildRefreshStatusItem({
        last_status: "running",
        estimated_progress_pct: 58,
      }),
      Date.now(),
    ),
  );
  const recoveredState = applyRefreshStatusResult(
    reconnectingState,
    buildRefreshStatusItem({
      last_status: "running",
      estimated_progress_pct: 63,
    }),
    Date.now(),
  );

  assert.equal(recoveredState.phase, "running");
  assert.equal(recoveredState.failureCount, 0);
  assert.equal(getNextPollingDelayMs(recoveredState), POLL_INTERVAL_MS);
});

test("delayed state appears after the timeout threshold without turning destructive", () => {
  const nowMs = Date.now();
  const timedOutState = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "queued",
      last_attempt_at: new Date(nowMs - POLL_TIMEOUT_MS - 1_000).toISOString(),
      estimated_progress_pct: 22,
    }),
    nowMs,
  );

  assert.equal(hasRefreshTimedOut(timedOutState, nowMs), true);

  const delayedState = createDelayedRefreshState(timedOutState);
  const view = getRefreshViewModel(delayedState);

  assert.equal(delayedState.phase, "delayed");
  assert.equal(view.isDestructive, false);
  assert.equal(view.showManualStatusButton, true);
  assert.equal(view.message, "Esta atualizacao esta demorando mais que o normal.");
});

test("manual refresh from delayed enables request again when no active status is found", () => {
  const delayedState = createDelayedRefreshState(
    hydrateRefreshState(
      buildRefreshStatusItem({
        last_status: "running",
        estimated_progress_pct: 54,
      }),
      Date.now(),
    ),
  );
  const checkedState = applyRefreshStatusResult(
    delayedState,
    null,
    Date.now(),
    { source: "manual" },
  );

  assert.equal(checkedState.phase, "delayed");
  assert.equal(checkedState.canRequestAgain, true);

  const view = getRefreshViewModel(checkedState);
  assert.equal(view.showRequestAgainButton, true);
});
