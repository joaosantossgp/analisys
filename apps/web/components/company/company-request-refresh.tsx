"use client";

import { LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  type RefreshStatusItem,
  fetchRefreshStatus,
  fetchRequestRefresh,
  getUserFacingErrorMessage,
  isApiClientError,
} from "@/lib/api";
import { getReadableRefreshSuccessKey } from "@/lib/company-detail-handoff";
import {
  applyManualStatusFailure,
  applyRefreshPollFailure,
  applyRefreshStatusResult,
  createAlreadyCurrentRefreshState,
  createDelayedRefreshState,
  createDispatchFailureState,
  createDispatchedRefreshState,
  createIdleRefreshState,
  createSubmittingRefreshState,
  getNextPollingDelayMs,
  getRefreshViewModel,
  hasRefreshTimedOut,
  hydrateRefreshState,
  isAutoPollingPhase,
  RELOAD_DELAY_MS,
  type RefreshMachineState,
} from "@/lib/company-refresh-state";
import { cn } from "@/lib/utils";

type CompanyRequestRefreshProps = {
  cdCvm: number;
  initialStatus?: RefreshStatusItem | null;
};

export function CompanyRequestRefresh({
  cdCvm,
  initialStatus = null,
}: CompanyRequestRefreshProps) {
  const router = useRouter();
  const [state, setState] = useState<RefreshMachineState>(() =>
    createIdleRefreshState(),
  );
  const [isManualStatusRefreshing, setIsManualStatusRefreshing] =
    useState(false);
  const hydratedInitialStatusRef = useRef(false);
  const isMountedRef = useRef(true);
  const reloadTimerRef = useRef<number | null>(null);
  const view = getRefreshViewModel(state);
  const successHandoffKey =
    state.phase === "success"
      ? state.currentItem
        ? getReadableRefreshSuccessKey(state.currentItem)
        : "already-current"
      : null;

  const pollRefreshStatus = useCallback(
    async (source: "auto" | "manual") => {
      try {
        const items = await fetchRefreshStatus(cdCvm);

        if (!isMountedRef.current) {
          return;
        }

        setState((currentState) =>
          applyRefreshStatusResult(
            currentState,
            items[0] ?? null,
            Date.now(),
            { source },
          ),
        );
      } catch {
        if (!isMountedRef.current) {
          return;
        }

        setState((currentState) =>
          source === "manual"
            ? applyManualStatusFailure(currentState)
            : applyRefreshPollFailure(currentState),
        );
      } finally {
        if (isMountedRef.current && source === "manual") {
          setIsManualStatusRefreshing(false);
        }
      }
    },
    [cdCvm],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

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
    setState(hydrateRefreshState(initialStatus));
  }, [initialStatus]);

  useEffect(() => {
    if (!successHandoffKey) {
      return;
    }

    router.refresh();

    reloadTimerRef.current = window.setTimeout(() => {
      router.refresh();
    }, RELOAD_DELAY_MS);

    return () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [router, successHandoffKey]);

  useEffect(() => {
    if (!isAutoPollingPhase(state.phase)) {
      return;
    }

    if (hasRefreshTimedOut(state, Date.now())) {
      setState((currentState) =>
        hasRefreshTimedOut(currentState, Date.now())
          ? createDelayedRefreshState(currentState)
          : currentState,
      );
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void pollRefreshStatus("auto");
    }, getNextPollingDelayMs(state));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pollRefreshStatus, state]);

  async function handleRequestRefresh() {
    if (view.requestButtonDisabled) {
      return;
    }

    setState(createSubmittingRefreshState());

    try {
      const payload = await fetchRequestRefresh(cdCvm);

      if (!isMountedRef.current) {
        return;
      }

      if (payload.status === "already_current") {
        setState(createAlreadyCurrentRefreshState(payload.message));
        return;
      }

      setState(createDispatchedRefreshState(Date.now()));
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      if (isApiClientError(error) && error.status === 429) {
        setState(createDispatchedRefreshState(Date.now()));
        return;
      }

      setState(createDispatchFailureState(getUserFacingErrorMessage(error)));
    }
  }

  function handleManualStatusRefresh() {
    if (state.phase !== "delayed" || isManualStatusRefreshing) {
      return;
    }

    setIsManualStatusRefreshing(true);
    void pollRefreshStatus("manual");
  }

  const showButtonSpinner =
    state.phase === "submitting" ||
    state.phase === "queued" ||
    state.phase === "running" ||
    state.phase === "reconnecting" ||
    state.phase === "success";
  const progressLabel = view.estimate
    ? `${Math.round(view.estimate.progress)}%`
    : null;

  return (
    <div className="flex min-w-[18rem] flex-col gap-3 sm:max-w-xl">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-fit rounded-full px-5"
        onClick={handleRequestRefresh}
        disabled={view.requestButtonDisabled}
      >
        {showButtonSpinner ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : null}
        {view.requestButtonLabel}
      </Button>

      {view.showCard ? (
        <Alert
          className={
            view.isDestructive
              ? "rounded-[1.5rem] border border-destructive/25 bg-destructive/6 px-4 py-4"
              : "rounded-[1.5rem] border border-border/70 bg-muted/28 px-4 py-4"
          }
        >
          <AlertTitle className="space-y-2">
            <Badge
              variant="outline"
              className={cn(
                "w-fit rounded-full border px-2.5 py-0.5 text-[0.7rem] uppercase tracking-[0.18em]",
                view.stepClassName,
              )}
            >
              {view.stepLabel}
            </Badge>
            <span className="block">{view.title}</span>
          </AlertTitle>

          <AlertDescription
            className="space-y-3"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>{view.message}</p>
            {view.detail ? <p>{view.detail}</p> : null}

            {view.estimate ? (
              <div className="rounded-[1.25rem] border border-border/65 bg-background/82 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.22)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Progresso do refresh
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Acompanhamento aproximado da atualizacao on-demand.
                    </p>
                  </div>
                  {progressLabel ? (
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {progressLabel}
                    </p>
                  ) : null}
                </div>

                <Progress
                  value={view.estimate.progress}
                  aria-label="Progresso estimado da atualizacao on-demand"
                  indicatorClassName={view.estimate.indicatorClassName}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{view.estimate.etaLabel}</span>
                  {view.estimate.completionLabel ? (
                    <span>{view.estimate.completionLabel}</span>
                  ) : null}
                </div>

                {view.estimate.confidenceLabel ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {view.estimate.confidenceLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            {view.showManualStatusButton || view.showRequestAgainButton ? (
              <div className="flex flex-wrap items-center gap-2">
                {view.showManualStatusButton ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-3"
                    onClick={handleManualStatusRefresh}
                    disabled={isManualStatusRefreshing}
                  >
                    {isManualStatusRefreshing ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <RotateCcwIcon />
                    )}
                    {isManualStatusRefreshing
                      ? "Atualizando status..."
                      : "Atualizar status agora"}
                  </Button>
                ) : null}

                {view.showRequestAgainButton ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3"
                    onClick={handleRequestRefresh}
                    disabled={isManualStatusRefreshing}
                  >
                    Solicitar novamente
                  </Button>
                ) : null}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
