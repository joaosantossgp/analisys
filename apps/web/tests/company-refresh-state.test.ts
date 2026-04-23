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
  getCompanyFreshnessCopy,
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
    read_model_updated_at: null,
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
    latest_readable_year: null,
    latest_attempt_outcome: null,
    latest_attempt_reason_code: null,
    latest_attempt_reason_message: null,
    latest_attempt_retryable: false,
    read_availability_code: null,
    read_availability_message: null,
    freshness_summary_code: null,
    freshness_summary_message: null,
    freshness_summary_severity: null,
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
    "Esta atualizacao esta demorando mais que o normal.",
  );
  assert.equal(view.stepLabel, "Demorado");
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

test("mixed no-data freshness copy preserves the readable current data", () => {
  const copy = getCompanyFreshnessCopy(
    buildRefreshStatusItem({
      last_status: "no_data",
      tracking_state: "no_data",
      has_readable_current_data: true,
      readable_years_count: 8,
      latest_readable_year: 2024,
      latest_attempt_outcome: "no_data",
      latest_attempt_reason_code: "no_new_financial_history",
      latest_attempt_reason_message:
        "A ultima tentativa nao encontrou novos demonstrativos.",
      freshness_summary_code: "mixed_no_new_data_readable",
      freshness_summary_message:
        "A ultima tentativa nao encontrou novos demonstrativos; a leitura atual continua disponivel.",
      freshness_summary_severity: "info",
      is_retry_allowed: true,
      latest_attempt_retryable: true,
    }),
  );

  assert.equal(copy.badgeLabel, "Sem novos dados");
  assert.equal(copy.title, "Leitura atual preservada");
  assert.equal(
    copy.description,
    "A ultima tentativa nao encontrou novos demonstrativos; a leitura atual continua disponivel.",
  );
  assert.equal(copy.latestResultLabel, "Sem novos demonstrativos");
});

test("mixed retryable error stays non-destructive when readable data exists", () => {
  const item = buildRefreshStatusItem({
    last_status: "error",
    tracking_state: "error",
    last_error: "HTTP 500 ao consultar CVM",
    has_readable_current_data: true,
    readable_years_count: 8,
    latest_readable_year: 2024,
    latest_attempt_outcome: "error",
    latest_attempt_reason_code: "refresh_failed_retryable",
    latest_attempt_reason_message:
      "Nao foi possivel concluir a atualizacao desta empresa agora.",
    latest_attempt_retryable: true,
    freshness_summary_code: "mixed_retryable_error_readable",
    freshness_summary_message:
      "A leitura atual continua disponivel, mas a ultima atualizacao falhou e pode ser tentada novamente.",
    freshness_summary_severity: "warning",
    is_retry_allowed: true,
  });
  const state = applyRefreshStatusResult(
    createDispatchedRefreshState(Date.now()),
    item,
    Date.now(),
  );

  assert.equal(state.phase, "mixed_outcome");

  const view = getRefreshViewModel(state);
  assert.equal(view.isDestructive, false);
  assert.equal(view.requestButtonDisabled, false);
  assert.equal(view.stepLabel, "Retry possivel");
  assert.equal(
    view.message,
    "A leitura atual continua disponivel, mas a ultima atualizacao falhou e pode ser tentada novamente.",
  );

  const copy = getCompanyFreshnessCopy(item);
  assert.equal(copy.badgeLabel, "Leitura preservada");
  assert.equal(copy.title, "Leitura atual preservada");
});

test("no annual history copy sets a clear terminal expectation", () => {
  const copy = getCompanyFreshnessCopy(
    buildRefreshStatusItem({
      last_status: "no_data",
      tracking_state: "no_data",
      status_reason_code: "no_financial_history_found",
      latest_attempt_outcome: "no_data",
      latest_attempt_reason_code: "no_annual_history",
      latest_attempt_reason_message:
        "Nenhuma serie anual legivel foi encontrada para esta companhia.",
      freshness_summary_code: "no_annual_history",
      freshness_summary_message:
        "Nenhuma serie anual legivel foi encontrada para esta companhia.",
      freshness_summary_severity: "info",
      is_retry_allowed: true,
      latest_attempt_retryable: true,
    }),
  );

  assert.equal(copy.badgeLabel, "Sem serie anual");
  assert.equal(copy.title, "Sem historico anual legivel");
  assert.equal(copy.latestResultLabel, "Sem serie anual");
  assert.match(copy.retryHint ?? "", /CVM/);
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

test("technical success without readable data does not trigger success handoff", () => {
  const state = applyRefreshStatusResult(
    createDispatchedRefreshState(Date.now()),
    buildRefreshStatusItem({
      last_status: "success",
      tracking_state: "success",
      status_reason_message:
        "Atualizacao concluida, aguardando a leitura ficar disponivel.",
      has_readable_current_data: false,
      readable_years_count: 0,
      latest_readable_year: null,
    }),
    Date.now(),
  );

  assert.equal(state.phase, "delayed");

  const view = getRefreshViewModel(state);
  assert.equal(view.isDestructive, false);
  assert.equal(view.showManualStatusButton, true);
  assert.equal(
    view.message,
    "Atualizacao concluida, aguardando a leitura ficar disponivel.",
  );
});

test("readable terminal success enters success handoff", () => {
  const state = applyRefreshStatusResult(
    createDispatchedRefreshState(Date.now()),
    buildRefreshStatusItem({
      last_status: "success",
      tracking_state: "success",
      status_reason_message: "Dados prontos para leitura nesta pagina.",
      has_readable_current_data: true,
      readable_years_count: 2,
      latest_readable_year: 2024,
      read_model_updated_at: "2026-04-21T12:05:00+00:00",
    }),
    Date.now(),
  );

  assert.equal(state.phase, "success");

  const view = getRefreshViewModel(state);
  assert.equal(view.requestButtonDisabled, true);
  assert.equal(view.message, "Dados prontos para leitura nesta pagina.");
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

test("already_current freshness copy avoids implying a new download", () => {
  const copy = getCompanyFreshnessCopy(
    buildRefreshStatusItem({
      last_status: "success",
      tracking_state: "success",
      has_readable_current_data: true,
      readable_years_count: 8,
      latest_readable_year: 2024,
      status_reason_code: "already_current",
      status_reason_message:
        "Esta empresa ja estava atualizada para a janela padrao.",
      latest_attempt_outcome: "success",
      latest_attempt_reason_code: "already_current",
      latest_attempt_reason_message:
        "Esta empresa ja estava atualizada para a janela padrao.",
      freshness_summary_code: "already_current",
      freshness_summary_message:
        "A leitura local ja estava atualizada para a janela padrao.",
      freshness_summary_severity: "success",
    }),
  );

  assert.equal(copy.badgeLabel, "Ja atualizada");
  assert.equal(copy.title, "Leitura ja atualizada");
  assert.equal(
    copy.description,
    "A leitura local ja estava atualizada para a janela padrao.",
  );
});
