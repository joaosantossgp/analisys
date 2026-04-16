"use client";

import { LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  type RefreshStatusItem,
  fetchRefreshStatus,
  fetchRequestRefresh,
  getUserFacingErrorMessage,
  isApiClientError,
} from "@/lib/api";

type CompanyRequestRefreshProps = {
  cdCvm: number;
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
};

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 15 * 60 * 1_000;
const RELOAD_DELAY_MS = 1_200;

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

export function CompanyRequestRefresh({
  cdCvm,
}: CompanyRequestRefreshProps) {
  const [state, setState] = useState<RefreshState>({ phase: "idle" });
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
      }
    };
  }, []);

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
        setState({
          phase: "timeout",
          message: "O processamento ainda nao terminou.",
          detail:
            "Voce pode tentar novamente para reiniciar o acompanhamento desta empresa.",
        });
        return;
      }

      try {
        const items = await fetchRefreshStatus(cdCvm);

        if (!active) {
          return;
        }

        const currentItem = items[0];
        const currentStatus = currentItem?.last_status;

        if (currentStatus === "success") {
          setState({
            phase: "success",
            message: "Dados disponiveis! Recarregando...",
            detail: "A leitura detalhada desta empresa sera atualizada agora.",
          });
          reloadTimerRef.current = window.setTimeout(() => {
            window.location.reload();
          }, RELOAD_DELAY_MS);
          return;
        }

        if (currentStatus === "error" || currentStatus === "dispatch_failed") {
          setState({
            phase: "error",
            message:
              currentItem?.last_error ??
              "Nao foi possivel concluir a atualizacao desta empresa.",
            detail:
              "A solicitacao foi encerrada com falha. Tente novamente em instantes.",
          });
          return;
        }

        const copy = getPollingCopy(currentItem);
        setState((currentState) =>
          currentState.phase === "polling"
            ? {
                ...currentState,
                message: copy.message,
                detail: copy.detail,
              }
            : currentState,
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          phase: "error",
          message: getUserFacingErrorMessage(error),
          detail:
            "O acompanhamento do refresh foi interrompido. Tente novamente em instantes.",
        });
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
    if (state.phase === "submitting" || state.phase === "polling" || state.phase === "success") {
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
      });
    } catch (error) {
      if (isApiClientError(error) && error.status === 429) {
        setState({
          phase: "polling",
          startedAt: Date.now(),
          message: "Solicitacao ja em andamento.",
          detail: "Acompanhando o processamento atual desta companhia.",
        });
        return;
      }

      setState({
        phase: "error",
        message: getUserFacingErrorMessage(error),
        detail: "Tente novamente em instantes.",
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
