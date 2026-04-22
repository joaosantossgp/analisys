import type { RefreshStatusItem } from "@/lib/api";

export type RefreshPhase =
  | "idle"
  | "submitting"
  | "queued"
  | "running"
  | "reconnecting"
  | "delayed"
  | "no_data"
  | "terminal_error"
  | "success";

export type RefreshMachineState = {
  phase: RefreshPhase;
  startedAt?: number;
  currentItem: RefreshStatusItem | null;
  lastKnownActiveItem: RefreshStatusItem | null;
  failureCount: number;
  canRequestAgain: boolean;
  notice: string | null;
  terminalMessage: string | null;
};

export type RefreshEstimate = {
  progress: number;
  etaLabel: string;
  completionLabel?: string;
  confidenceLabel?: string;
  indicatorClassName: string;
};

export type RefreshViewModel = {
  showCard: boolean;
  title: string;
  message: string;
  detail?: string;
  stepLabel: string;
  stepClassName: string;
  isDestructive: boolean;
  estimate: RefreshEstimate | null;
  requestButtonLabel: string;
  requestButtonDisabled: boolean;
  showManualStatusButton: boolean;
  showRequestAgainButton: boolean;
};

export const POLL_INTERVAL_MS = 5_000;
export const POLL_TIMEOUT_MS = 15 * 60 * 1_000;
export const RELOAD_DELAY_MS = 1_200;

const RECONNECT_DELAY_SEQUENCE_MS = [5_000, 10_000, 20_000, 30_000];
const ACTIVE_REFRESH_STATUSES = new Set(["queued", "running"]);
const TERMINAL_REFRESH_STATUSES = new Set(["error"]);
const ESTIMATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function normalizeStatus(status: string | null | undefined): string {
  return String(status || "").trim().toLowerCase();
}

function getStageLabel(item: RefreshStatusItem | null | undefined): string {
  const stage = normalizeStatus(item?.stage);
  switch (stage) {
    case "planning":
      return "Planejando";
    case "download_extract":
      return "Baixando";
    case "process_data":
      return "Processando";
    case "persist_reports":
      return "Gravando";
    case "finalizing":
      return "Finalizando";
    default:
      return normalizeStatus(item?.last_status) === "running"
        ? "Processando"
        : "Na fila";
  }
}

function getQueuedMessage(
  item: RefreshStatusItem | null | undefined,
): { message: string; detail: string } {
  const queuePosition = item?.queue_position ?? null;
  if (typeof queuePosition === "number" && queuePosition > 0) {
    return {
      message: "Solicitacao na fila interna.",
      detail: `Ha ${queuePosition} job(s) na frente desta empresa no worker interno.`,
    };
  }

  return {
    message: "Solicitacao enviada. Aguardando processamento...",
    detail:
      item?.progress_message ??
      "Aguardando o worker interno iniciar esta solicitacao.",
  };
}

function getRunningMessage(
  item: RefreshStatusItem | null | undefined,
): { message: string; detail: string } {
  return {
    message:
      item?.progress_message ?? "Atualizando demonstracoes financeiras...",
    detail:
      item?.stage
        ? `Etapa atual: ${getStageLabel(item).toLowerCase()}.`
        : "Os dados desta companhia estao sendo processados agora.",
  };
}

function getBadgeClassName(phase: RefreshPhase): string {
  switch (phase) {
    case "running":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "reconnecting":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "delayed":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "no_data":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "terminal_error":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:
      return "border-border/70 bg-muted/60 text-foreground/80";
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return "menos de 1 min";
  }

  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatEstimatedTime(dateIso: string | null | undefined): string | null {
  if (!dateIso) {
    return null;
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return ESTIMATE_TIME_FORMATTER.format(date);
}

function getConfidenceLabel(confidence: string | null | undefined): string | null {
  switch (normalizeStatus(confidence)) {
    case "high":
      return "Estimativa baseada no progresso real do job.";
    case "medium":
      return "Estimativa baseada nas ultimas execucoes concluidas.";
    case "low":
      return "Estimativa inicial.";
    default:
      return null;
  }
}

function getFallbackProgress(
  phase: RefreshPhase,
  item: RefreshStatusItem | null | undefined,
): number {
  const itemStatus = normalizeStatus(item?.last_status);

  if (itemStatus === "running") {
    return phase === "delayed" ? 64 : 42;
  }

  if (itemStatus === "queued") {
    return phase === "delayed" ? 26 : 16;
  }

  switch (phase) {
    case "submitting":
      return 6;
    case "running":
      return 42;
    case "reconnecting":
      return 38;
    case "delayed":
      return 52;
    case "success":
      return 100;
    default:
      return 16;
  }
}

function getEstimateIndicatorClassName(phase: RefreshPhase): string {
  switch (phase) {
    case "submitting":
      return "bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400";
    case "queued":
      return "bg-gradient-to-r from-slate-500 via-sky-400 to-cyan-400";
    case "reconnecting":
      return "bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400";
    case "delayed":
      return "bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400";
    case "success":
      return "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400";
    default:
      return "bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400";
  }
}

function getEstimateReferenceItem(
  state: RefreshMachineState,
): RefreshStatusItem | null {
  if (isActiveRefreshStatus(state.currentItem?.last_status)) {
    return state.currentItem;
  }

  return state.lastKnownActiveItem;
}

function buildRefreshEstimate(state: RefreshMachineState): RefreshEstimate | null {
  if (
    state.phase === "idle" ||
    state.phase === "terminal_error" ||
    state.phase === "no_data"
  ) {
    return null;
  }

  if (state.phase === "success") {
    return {
      progress: 100,
      etaLabel: "Processamento concluido",
      indicatorClassName: getEstimateIndicatorClassName(state.phase),
    };
  }

  const item = getEstimateReferenceItem(state);
  const fallbackProgress = getFallbackProgress(state.phase, item);

  if (state.phase === "submitting") {
    return {
      progress: fallbackProgress,
      etaLabel: "Preparando o acompanhamento do refresh...",
      indicatorClassName: getEstimateIndicatorClassName(state.phase),
    };
  }

  const progress = Math.min(
    100,
    Math.max(8, item?.estimated_progress_pct ?? fallbackProgress),
  );
  const totalSeconds = item?.estimated_total_seconds;
  const elapsedSeconds = item?.elapsed_seconds;
  const etaSeconds = item?.estimated_eta_seconds;
  const isOverdue =
    typeof totalSeconds === "number" &&
    typeof elapsedSeconds === "number" &&
    elapsedSeconds > totalSeconds;
  const confidence = normalizeStatus(item?.estimate_confidence);
  const completionTime = formatEstimatedTime(item?.estimated_completion_at);
  const hasEstimate =
    typeof etaSeconds === "number" ||
    typeof totalSeconds === "number" ||
    typeof elapsedSeconds === "number";

  return {
    progress,
    etaLabel: isOverdue
      ? "Acima da estimativa, mas ainda em processamento."
      : typeof etaSeconds === "number" && etaSeconds > 0
        ? `~${formatDuration(etaSeconds)} restantes`
        : hasEstimate
          ? "Finalizando a atualizacao..."
          : "Estimativa ainda indisponivel",
    completionLabel:
      (confidence === "medium" || confidence === "high") && completionTime
        ? `Previsao: ${completionTime}`
        : undefined,
    confidenceLabel: getConfidenceLabel(item?.estimate_confidence) ?? undefined,
    indicatorClassName: getEstimateIndicatorClassName(state.phase),
  };
}

function buildActiveState(
  phase: "queued" | "running",
  item: RefreshStatusItem,
  nowMs: number,
  currentState?: RefreshMachineState,
): RefreshMachineState {
  return {
    phase,
    startedAt:
      parseTimestamp(item.last_attempt_at) ??
      currentState?.startedAt ??
      nowMs,
    currentItem: item,
    lastKnownActiveItem: item,
    failureCount: 0,
    canRequestAgain: false,
    notice: null,
    terminalMessage: null,
  };
}

export function isActiveRefreshStatus(
  status: string | null | undefined,
): boolean {
  return ACTIVE_REFRESH_STATUSES.has(normalizeStatus(status));
}

export function parseTimestamp(
  value: string | null | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function createIdleRefreshState(): RefreshMachineState {
  return {
    phase: "idle",
    currentItem: null,
    lastKnownActiveItem: null,
    failureCount: 0,
    canRequestAgain: false,
    notice: null,
    terminalMessage: null,
  };
}

export function createSubmittingRefreshState(): RefreshMachineState {
  return {
    phase: "submitting",
    currentItem: null,
    lastKnownActiveItem: null,
    failureCount: 0,
    canRequestAgain: false,
    notice: null,
    terminalMessage: null,
  };
}

export function createDispatchedRefreshState(
  nowMs = Date.now(),
): RefreshMachineState {
  return {
    phase: "queued",
    startedAt: nowMs,
    currentItem: null,
    lastKnownActiveItem: null,
    failureCount: 0,
    canRequestAgain: false,
    notice: null,
    terminalMessage: null,
  };
}

export function createAlreadyCurrentRefreshState(
  message?: string,
): RefreshMachineState {
  return {
    phase: "success",
    currentItem: null,
    lastKnownActiveItem: null,
    failureCount: 0,
    canRequestAgain: false,
    notice: message ?? "Esta empresa ja estava atualizada.",
    terminalMessage: null,
  };
}

export function createDispatchFailureState(
  message?: string,
): RefreshMachineState {
  return {
    phase: "terminal_error",
    currentItem: null,
    lastKnownActiveItem: null,
    failureCount: 0,
    canRequestAgain: false,
    notice: null,
    terminalMessage:
      message ?? "Nao foi possivel iniciar a atualizacao desta empresa.",
  };
}

export function hydrateRefreshState(
  initialStatus: RefreshStatusItem | null | undefined,
  nowMs = Date.now(),
): RefreshMachineState {
  if (isActiveRefreshStatus(initialStatus?.last_status) && initialStatus) {
    return buildActiveState(
      normalizeStatus(initialStatus.last_status) as "queued" | "running",
      initialStatus,
      nowMs,
    );
  }

  if (normalizeStatus(initialStatus?.last_status) === "no_data" && initialStatus) {
    return {
      phase: "no_data",
      startedAt: parseTimestamp(initialStatus.last_attempt_at) ?? nowMs,
      currentItem: initialStatus,
      lastKnownActiveItem: null,
      failureCount: 0,
      canRequestAgain: true,
      notice: null,
      terminalMessage:
        initialStatus.progress_message ??
        initialStatus.last_error ??
        "Nenhuma demonstracao foi encontrada para o intervalo solicitado.",
    };
  }

  return createIdleRefreshState();
}

export function isAutoPollingPhase(phase: RefreshPhase): boolean {
  return (
    phase === "queued" || phase === "running" || phase === "reconnecting"
  );
}

export function hasRefreshTimedOut(
  state: RefreshMachineState,
  nowMs: number,
  timeoutMs = POLL_TIMEOUT_MS,
): boolean {
  return (
    isAutoPollingPhase(state.phase) &&
    state.startedAt !== undefined &&
    nowMs - state.startedAt >= timeoutMs
  );
}

export function createDelayedRefreshState(
  state: RefreshMachineState,
): RefreshMachineState {
  return {
    ...state,
    phase: "delayed",
    currentItem: state.currentItem ?? state.lastKnownActiveItem,
    failureCount: 0,
    canRequestAgain: false,
    notice: null,
  };
}

export function getReconnectDelayMs(failureCount: number): number {
  if (failureCount <= 1) {
    return RECONNECT_DELAY_SEQUENCE_MS[0];
  }

  if (failureCount === 2) {
    return RECONNECT_DELAY_SEQUENCE_MS[1];
  }

  if (failureCount === 3) {
    return RECONNECT_DELAY_SEQUENCE_MS[2];
  }

  return RECONNECT_DELAY_SEQUENCE_MS[3];
}

export function getNextPollingDelayMs(
  state: RefreshMachineState,
): number {
  if (state.phase === "reconnecting") {
    return getReconnectDelayMs(state.failureCount);
  }

  return POLL_INTERVAL_MS;
}

export function applyRefreshPollFailure(
  state: RefreshMachineState,
): RefreshMachineState {
  if (!isAutoPollingPhase(state.phase)) {
    return state;
  }

  return {
    ...state,
    phase: "reconnecting",
    currentItem: state.currentItem ?? state.lastKnownActiveItem,
    failureCount: state.failureCount + 1,
    canRequestAgain: false,
    notice: "Conexao instavel. Tentando reconectar...",
  };
}

export function applyManualStatusFailure(
  state: RefreshMachineState,
): RefreshMachineState {
  if (state.phase !== "delayed") {
    return state;
  }

  return {
    ...state,
    notice: "Nao foi possivel atualizar o status agora. Tente novamente.",
  };
}

export function applyRefreshStatusResult(
  state: RefreshMachineState,
  item: RefreshStatusItem | null,
  nowMs: number,
  options: { source?: "auto" | "manual" } = {},
): RefreshMachineState {
  const source = options.source ?? "auto";

  if (source === "auto" && !isAutoPollingPhase(state.phase)) {
    return state;
  }

  if (source === "manual" && state.phase !== "delayed") {
    return state;
  }

  const status = normalizeStatus(item?.last_status);

  if (!item) {
    if (source === "manual") {
      return {
        ...createDelayedRefreshState(state),
        canRequestAgain: true,
        notice: "Nenhum refresh ativo foi encontrado agora.",
      };
    }

    if (state.lastKnownActiveItem) {
      return applyRefreshPollFailure(state);
    }

    return {
      ...state,
      phase: "queued",
      startedAt: state.startedAt ?? nowMs,
      currentItem: null,
      failureCount: 0,
      canRequestAgain: false,
      notice: null,
      terminalMessage: null,
    };
  }

  if (status === "success") {
    return {
      ...state,
      phase: "success",
      currentItem: item,
      failureCount: 0,
      canRequestAgain: false,
      notice: null,
      terminalMessage: null,
    };
  }

  if (status === "no_data") {
    return {
      ...state,
      phase: "no_data",
      currentItem: item,
      failureCount: 0,
      canRequestAgain: true,
      notice: null,
      terminalMessage:
        item.progress_message ??
        item.last_error ??
        "Nenhuma demonstracao foi encontrada para o intervalo solicitado.",
    };
  }

  if (TERMINAL_REFRESH_STATUSES.has(status)) {
    return {
      ...state,
      phase: "terminal_error",
      currentItem: item,
      failureCount: 0,
      canRequestAgain: false,
      notice: null,
      terminalMessage:
        item.last_error ??
        "Nao foi possivel concluir a atualizacao desta empresa.",
    };
  }

  if (status === "queued" || status === "running") {
    return buildActiveState(status, item, nowMs, state);
  }

  if (source === "manual") {
    return {
      ...createDelayedRefreshState(state),
      canRequestAgain: true,
      notice: "Nenhum refresh ativo foi encontrado agora.",
    };
  }

  return applyRefreshPollFailure(state);
}

export function getRefreshViewModel(
  state: RefreshMachineState,
): RefreshViewModel {
  const estimate = buildRefreshEstimate(state);

  switch (state.phase) {
    case "submitting":
      return {
        showCard: true,
        title: "Atualizacao em andamento",
        message: "Enviando solicitacao...",
        detail: "Preparando o disparo on-demand desta companhia.",
        stepLabel: "Na fila",
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Enviando...",
        requestButtonDisabled: true,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    case "queued": {
      const copy = getQueuedMessage(state.currentItem);
      return {
        showCard: true,
        title: "Atualizacao em andamento",
        message: copy.message,
        detail: copy.detail,
        stepLabel: getStageLabel(state.currentItem),
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Acompanhando atualizacao",
        requestButtonDisabled: true,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    }
    case "running": {
      const copy = getRunningMessage(state.currentItem);
      return {
        showCard: true,
        title: "Atualizacao em andamento",
        message: copy.message,
        detail: copy.detail,
        stepLabel: getStageLabel(state.currentItem),
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Acompanhando atualizacao",
        requestButtonDisabled: true,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    }
    case "reconnecting":
      return {
        showCard: true,
        title: "Atualizacao em andamento",
        message: "Conexao instavel. Tentando reconectar...",
        detail:
          "Mantendo a ultima leitura conhecida enquanto retomamos o acompanhamento.",
        stepLabel: "Reconectando",
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Reconectando...",
        requestButtonDisabled: true,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    case "delayed":
      return {
        showCard: true,
        title: "Atualizacao em andamento",
        message: "Esta atualizacao esta demorando mais que o normal.",
        detail: state.notice
          ? `${state.notice} ${
              state.canRequestAgain
                ? "Se os dados ainda nao apareceram, voce pode solicitar novamente."
                : ""
            }`.trim()
          : "O acompanhamento automatico foi pausado para evitar consultas repetidas. Atualize o status manualmente.",
        stepLabel: "Demorado",
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Atualizacao demorada",
        requestButtonDisabled: true,
        showManualStatusButton: true,
        showRequestAgainButton: state.canRequestAgain,
      };
    case "no_data":
      return {
        showCard: true,
        title: "Nenhum dado encontrado",
        message:
          state.terminalMessage ??
          "Nenhuma demonstracao foi encontrada para o intervalo solicitado.",
        detail:
          "Esse resultado e terminal e informativo. Voce pode solicitar novamente depois, se necessario.",
        stepLabel: "Sem dados",
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Solicitar novamente",
        requestButtonDisabled: false,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    case "terminal_error":
      return {
        showCard: true,
        title: "Refresh indisponivel",
        message:
          state.terminalMessage ??
          "Nao foi possivel concluir a atualizacao desta empresa.",
        detail: "Voce pode solicitar novamente em instantes.",
        stepLabel: "Falha",
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: true,
        estimate,
        requestButtonLabel: "Solicitar novamente",
        requestButtonDisabled: false,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    case "success":
      return {
        showCard: true,
        title: "Atualizacao concluida",
        message: state.notice ?? "Dados disponiveis! Recarregando...",
        detail:
          state.notice === null
            ? "A leitura detalhada desta empresa sera atualizada agora."
            : "A pagina sera atualizada para refletir o estado mais recente.",
        stepLabel: "Concluido",
        stepClassName: getBadgeClassName(state.phase),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Recarregando...",
        requestButtonDisabled: true,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
    default:
      return {
        showCard: false,
        title: "",
        message: "",
        detail: undefined,
        stepLabel: "Na fila",
        stepClassName: getBadgeClassName("queued"),
        isDestructive: false,
        estimate,
        requestButtonLabel: "Solicitar dados financeiros",
        requestButtonDisabled: false,
        showManualStatusButton: false,
        showRequestAgainButton: false,
      };
  }
}
