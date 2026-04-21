"use client";

import { LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  type RefreshStatusItem,
  fetchRefreshStatus,
  fetchRequestRefresh,
  getUserFacingErrorMessage,
  isApiClientError,
} from "@/lib/api";

type CompanyRequestRefreshProps = {
  cdCvm: number;
  initialStatus?: RefreshStatusItem | null;
};

type RefreshPhase =
  | "idle"
  | "submitting"
  | "polling"
  | "success"
  | "error"
  | "timeout";

type RefreshState = {
  phase: RefreshPhase;
  message?: string;
  detail?: string;
  startedAt?: number;
  currentItem?: RefreshStatusItem | null;
};

type RefreshEstimate = {
  progress: number;
  etaLabel: string;
  completionLabel?: string;
  confidenceLabel?: string;
  indicatorClassName: string;
};

const ACTIVE_REFRESH_STATUSES = new Set(["queued", "running"]);
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 15 * 60 * 1_000;
const RELOAD_DELAY_MS = 1_200;

const ESTIMATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function isActiveRefreshStatus(status: string | null | undefined): boolean {
  return ACTIVE_REFRESH_STATUSES.has(String(status || "").trim().toLowerCase());
}

function parseTimestamp(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function getPollingCopy(item: RefreshStatusItem | undefined): {
  message: string;
  detail?: string;
} {
  switch (item?.last_status) {
    case "queued":
      return {
        message: "Solicitacao enviada. Aguardando processamento...",
        detail: "Acompanhando a fila atual da ingestao on-demand.",
      };
    case "running":
      return {
        message: "Atualizando demonstracoes financeiras...",
        detail: "Os dados desta companhia estao sendo processados agora.",
      };
    default:
      return {
        message: "Acompanhando o processamento atual...",
        detail: "A pagina sera recarregada assim que os dados ficarem disponiveis.",
      };
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
  switch (String(confidence || "").trim().toLowerCase()) {
    case "high":
      return "Estimativa baseada em execucoes recentes consistentes.";
    case "medium":
      return "Estimativa baseada nas ultimas execucoes concluidas.";
    case "low":
      return "Estimativa inicial. A amostra historica ainda e pequena.";
    default:
      return null;
  }
}

function buildPollingState(item: RefreshStatusItem): RefreshState {
  const copy = getPollingCopy(item);
  return {
    phase: "polling",
    startedAt: parseTimestamp(item.last_attempt_at) ?? Date.now(),
    message: copy.message,
    detail: copy.detail,
    currentItem: item,
  };
}

function buildRefreshEstimate(
  phase: RefreshPhase,
  item: RefreshStatusItem | null | undefined,
): RefreshEstimate | null {
  if (phase === "submitting") {
    return {
      progress: 6,
      etaLabel: "Preparando a fila on-demand...",
      indicatorClassName:
        "bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400",
    };
  }

  if (phase === "success") {
    return {
      progress: 100,
      etaLabel: "Processamento concluido",
      indicatorClassName:
        "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400",
    };
  }

  if (!item || !isActiveRefreshStatus(item.last_status)) {
    return null;
  }

  const progress = Math.min(
    100,
    Math.max(
      8,
      item.estimated_progress_pct ??
        (String(item.last_status).toLowerCase() === "running" ? 28 : 14),
    ),
  );
  const totalSeconds = item.estimated_total_seconds;
  const elapsedSeconds = item.elapsed_seconds;
  const isOverdue =
    typeof totalSeconds === "number" &&
    typeof elapsedSeconds === "number" &&
    elapsedSeconds > totalSeconds;
  const etaSeconds = item.estimated_eta_seconds;
  const completionTime = formatEstimatedTime(item.estimated_completion_at);

  return {
    progress,
    etaLabel: isOverdue
      ? "Acima da estimativa, mas ainda em processamento."
      : typeof etaSeconds === "number" && etaSeconds > 0
        ? `~${formatDuration(etaSeconds)} restantes`
        : "Finalizando a atualizacao...",
    completionLabel: completionTime ? `Previsao: ${completionTime}` : undefined,
    confidenceLabel: getConfidenceLabel(item.estimate_confidence) ?? undefined,
    indicatorClassName:
      "bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400",
  };
}

export function CompanyRequestRefresh({
  cdCvm,
  initialStatus = null,
}: CompanyRequestRefreshProps) {
  const [state, setState] = useState<RefreshState>({ phase: "idle" });
  const reloadTimerRef = useRef<number | null>(null);
  const hydratedInitialStatusRef = useRef(false);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hydratedInitialStatusRef.current || !initialStatus) {
      return;
    }

    hydratedInitialStatusRef.current = true;
    if (isActiveRefreshStatus(initialStatus.last_status)) {
      setState(buildPollingState(initialStatus));
    }
  }, [initialStatus]);

  useEffect(() => {
    if (state.phase !== "polling" || state.startedAt === undefined) {
      return;
    }

    const pollingStartedAt = state.startedAt;
    let active = true;

    async function pollRefreshStatus() {
      if (!active) {
        return;
      }

      if (Date.now() - pollingStartedAt >= POLL_TIMEOUT_MS) {
        setState((currentState) => ({
          phase: "timeout",
          startedAt: currentState.startedAt,
          currentItem: currentState.currentItem,
          message: "O processamento ainda nao terminou.",
          detail:
            "Voce pode tentar novamente para reiniciar o acompanhamento desta empresa.",
        }));
        return;
      }

      try {
        const items = await fetchRefreshStatus(cdCvm);

        if (!active) {
          return;
        }

        const currentItem = items[0] ?? null;
        const currentStatus = currentItem?.last_status;

        if (currentStatus === "success") {
          setState((currentState) => ({
            phase: "success",
            startedAt: currentState.startedAt,
            currentItem,
            message: "Dados disponiveis! Recarregando...",
            detail: "A leitura detalhada desta empresa sera atualizada agora.",
          }));
          reloadTimerRef.current = window.setTimeout(() => {
            window.location.reload();
          }, RELOAD_DELAY_MS);
          return;
        }

        if (currentStatus === "error" || currentStatus === "dispatch_failed") {
          setState((currentState) => ({
            phase: "error",
            startedAt: currentState.startedAt,
            currentItem,
            message:
              currentItem?.last_error ??
              "Nao foi possivel concluir a atualizacao desta empresa.",
            detail:
              "A solicitacao foi encerrada com falha. Tente novamente em instantes.",
          }));
          return;
        }

        const copy = getPollingCopy(currentItem ?? undefined);
        setState((currentState) =>
          currentState.phase === "polling"
            ? {
                ...currentState,
                currentItem,
                message: copy.message,
                detail: copy.detail,
              }
            : currentState,
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setState((currentState) => ({
          phase: "error",
          startedAt: currentState.startedAt,
          currentItem: currentState.currentItem,
          message: getUserFacingErrorMessage(error),
          detail:
            "O acompanhamento do refresh foi interrompido. Tente novamente em instantes.",
        }));
      }
    }

    void pollRefreshStatus();

    const intervalId = window.setInterval(() => {
      void pollRefreshStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [cdCvm, state.phase, state.startedAt]);

  async function handleRequestRefresh() {
    if (
      state.phase === "submitting" ||
      state.phase === "polling" ||
      state.phase === "success"
    ) {
      return;
    }

    setState({
      phase: "submitting",
      message: "Solicitando atualizacao...",
      detail: "Preparando o disparo on-demand desta companhia.",
    });

    try {
      const payload = await fetchRequestRefresh(cdCvm);
      setState({
        phase: "polling",
        startedAt: Date.now(),
        message:
          payload.status === "dispatch_failed"
            ? "Dispatch registrado com falha. Acompanhando o status..."
            : "Solicitacao enviada. Acompanhando processamento...",
        detail:
          payload.status === "dispatch_failed"
            ? "O backend vai expor o status final desta tentativa na fila de refresh."
            : "A pagina sera recarregada assim que os dados estiverem prontos.",
        currentItem: null,
      });
    } catch (error) {
      if (isApiClientError(error) && error.status === 429) {
        setState({
          phase: "polling",
          startedAt: Date.now(),
          message: "Solicitacao ja em andamento.",
          detail: "Acompanhando o processamento atual desta companhia.",
          currentItem: null,
        });
        return;
      }

      setState({
        phase: "error",
        message: getUserFacingErrorMessage(error),
        detail: "Tente novamente em instantes.",
        currentItem: null,
      });
    }
  }

  function handleReset() {
    if (reloadTimerRef.current !== null) {
      window.clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }

    setState({ phase: "idle" });
  }

  const isBusy =
    state.phase === "submitting" ||
    state.phase === "polling" ||
    state.phase === "success";

  const buttonLabel =
    state.phase === "submitting"
      ? "Solicitando..."
      : state.phase === "polling"
        ? "Atualizando..."
        : state.phase === "success"
          ? "Recarregando..."
          : state.phase === "error" || state.phase === "timeout"
            ? "Solicitar novamente"
            : "Solicitar dados financeiros";

  const showStatus = state.phase !== "idle";
  const isDestructive = state.phase === "error" || state.phase === "timeout";
  const estimate = buildRefreshEstimate(state.phase, state.currentItem);
  const progressLabel = `${Math.round(estimate?.progress ?? 0)}%`;

  return (
    <div className="flex min-w-[18rem] flex-col gap-3 sm:max-w-xl">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-fit rounded-full px-5"
        onClick={handleRequestRefresh}
        disabled={isBusy}
      >
        {isBusy ? <LoaderCircleIcon className="animate-spin" /> : null}
        {buttonLabel}
      </Button>

      {showStatus ? (
        <Alert
          className={
            isDestructive
              ? "rounded-[1.5rem] border border-destructive/25 bg-destructive/6 px-4 py-4"
              : "rounded-[1.5rem] border border-border/70 bg-muted/28 px-4 py-4"
          }
        >
          <AlertTitle>
            {state.phase === "success"
              ? "Atualizacao concluida"
              : state.phase === "timeout"
                ? "Tempo limite atingido"
                : state.phase === "error"
                  ? "Refresh indisponivel"
                  : "Atualizacao em andamento"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{state.message}</p>
            {state.detail ? <p>{state.detail}</p> : null}

            {estimate ? (
              <div className="rounded-[1.25rem] border border-border/65 bg-background/82 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.22)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Estimativa de conclusao
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Progresso aproximado do refresh on-demand.
                    </p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {progressLabel}
                  </p>
                </div>

                <Progress
                  value={estimate.progress}
                  aria-label="Progresso estimado da atualizacao on-demand"
                  indicatorClassName={estimate.indicatorClassName}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{estimate.etaLabel}</span>
                  {estimate.completionLabel ? (
                    <span>{estimate.completionLabel}</span>
                  ) : null}
                </div>

                {estimate.confidenceLabel ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {estimate.confidenceLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            {state.phase === "timeout" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full px-3"
                onClick={handleReset}
              >
                <RotateCcwIcon />
                Tentar novamente
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
