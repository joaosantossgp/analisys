import test from "node:test";
import assert from "node:assert/strict";

import type { RefreshStatusItem } from "../lib/api.ts";
import {
  applyRefreshPollFailure,
  applyRefreshStatusResult,
  createAlreadyCurrentRefreshState,
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
    job_id: null,
    stage: null,
    queue_position: null,
    last_attempt_at: "2026-04-21T12:00:00+00:00",
    last_success_at: null,
    last_status: "queued",
    last_error: null,
    last_start_year: 2010,
    last_end_year: 2024,
    last_rows_inserted: null,
    progress_current: null,
    progress_total: null,
    progress_message: null,
    started_at: null,
    heartbeat_at: null,
    finished_at: null,
    updated_at: "2026-04-21T12:00:00+00:00",
    estimated_progress_pct: null,
    estimated_eta_seconds: null,
    estimated_total_seconds: null,
    elapsed_seconds: null,
    estimated_completion_at: null,
    estimate_confidence: null,
    tracking_state: null,
    progress_mode: null,
    is_retry_allowed: false,
    status_reason_code: null,
    status_reason_message: null,
    has_readable_current_data: false,
    readable_years_count: 0,
    latest_attempt_outcome: null,
    source_label: null,
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

test("high-confidence estimates are labeled as real job progress", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "running",
      stage: "download_extract",
      progress_current: 9,
      progress_total: 20,
      estimated_progress_pct: 31.4,
      estimated_eta_seconds: 840,
      estimated_total_seconds: 1260,
      elapsed_seconds: 420,
      estimated_completion_at: "2026-04-21T12:21:00+00:00",
      estimate_confidence: "high",
    }),
    Date.now(),
  );

  const view = getRefreshViewModel(state);

  assert.equal(view.stepLabel, "Baixando");
  assert.equal(
    view.estimate?.confidenceLabel,
    "Estimativa baseada no progresso real do job.",
  );
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
  assert.equal(getReconnectDelayMs(1), 5_000);
  assert.equal(getReconnectDelayMs(2), 10_000);
  assert.equal(getReconnectDelayMs(3), 20_000);
  assert.equal(getReconnectDelayMs(4), 30_000);
  assert.equal(getReconnectDelayMs(7), 30_000);
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
  assert.equal(
    view.message,
    "Esta solicitacao perdeu previsibilidade e precisa de uma nova checagem.",
  );
  assert.equal(view.stepLabel, "Travado");
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

test("no_data is treated as a terminal informative state", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "no_data",
      progress_message: "Nenhuma demonstracao encontrada para 2010-2025.",
    }),
    Date.now(),
  );

  assert.equal(state.phase, "no_data");

  const view = getRefreshViewModel(state);
  assert.equal(view.isDestructive, false);
  assert.equal(view.message, "Nenhuma demonstracao encontrada para 2010-2025.");
  assert.equal(view.requestButtonDisabled, false);
});

test("initial terminal no_data stays neutral when readable data already exists", () => {
  const state = hydrateRefreshState(
    buildRefreshStatusItem({
      last_status: "no_data",
      tracking_state: "no_data",
      has_readable_current_data: true,
      readable_years_count: 8,
      status_reason_message:
        "A ultima tentativa nao encontrou novos demonstrativos, mas a leitura atual continua disponivel.",
    }),
    Date.now(),
  );

  assert.equal(state.phase, "idle");
  assert.equal(getRefreshViewModel(state).showCard, false);
});

test("stalled tracking state keeps a manual recovery path", () => {
  const state = applyRefreshStatusResult(
    createDispatchedRefreshState(Date.now()),
    buildRefreshStatusItem({
      last_status: "queued",
      tracking_state: "stalled",
      progress_mode: "stalled",
      estimated_progress_pct: 22,
      status_reason_message:
        "A ultima solicitacao nao aparece mais como ativa. Atualize o status ou tente novamente.",
      is_retry_allowed: true,
    }),
    Date.now(),
  );

  assert.equal(state.phase, "delayed");
  assert.equal(state.canRequestAgain, true);

  const view = getRefreshViewModel(state);
  assert.equal(view.showManualStatusButton, true);
  assert.equal(view.showRequestAgainButton, true);
  assert.equal(
    view.message,
    "A ultima solicitacao nao aparece mais como ativa. Atualize o status ou tente novamente.",
  );
});

test("already_current uses the success state for immediate reload", () => {
  const state = createAlreadyCurrentRefreshState(
    "Empresa ja atualizada para 2010-2025.",
  );
  const view = getRefreshViewModel(state);

  assert.equal(state.phase, "success");
  assert.equal(view.message, "Empresa ja atualizada para 2010-2025.");
  assert.equal(view.requestButtonDisabled, true);
});
