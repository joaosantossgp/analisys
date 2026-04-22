import { CompanyRequestRefreshLazy } from "@/components/company/company-request-refresh-lazy";
import { SurfaceCard } from "@/components/shared/design-system-recipes";
import {
  fetchCompanyFreshness,
  getUserFacingErrorMessage,
  type RefreshStatusItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CompanyFreshnessCardProps = {
  cdCvm: number;
};

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("pt-BR", {
  numeric: "auto",
});

const ABSOLUTE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatRelative(dateIso: string): string | null {
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const diffSeconds = Math.round((Date.now() - target.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return RELATIVE_TIME_FORMATTER.format(-diffSeconds, "second");
  }

  const minutes = Math.round(diffSeconds / 60);
  if (Math.abs(minutes) < 60) {
    return RELATIVE_TIME_FORMATTER.format(-minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return RELATIVE_TIME_FORMATTER.format(-hours, "hour");
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return RELATIVE_TIME_FORMATTER.format(-days, "day");
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return RELATIVE_TIME_FORMATTER.format(-months, "month");
  }

  const years = Math.round(months / 12);
  return RELATIVE_TIME_FORMATTER.format(-years, "year");
}

function formatAbsolute(dateIso: string): string | null {
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return ABSOLUTE_TIME_FORMATTER.format(target);
}

function getStatusBadge(freshness: RefreshStatusItem | null) {
  const trackingState = String(freshness?.tracking_state ?? "").toLowerCase();

  if (trackingState === "queued" || trackingState === "running") {
    return {
      label: "Atualizando agora",
      className:
        "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  }

  if (trackingState === "stalled") {
    return {
      label: "Sem sinais recentes",
      className:
        "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (freshness?.has_readable_current_data) {
    return {
      label: "Leitura pronta",
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: "Historico pendente",
    className:
      "border-primary/20 bg-primary/8 text-primary/80",
  };
}

function getSummaryCopy(freshness: RefreshStatusItem | null): {
  title: string;
  description: string;
} {
  const trackingState = String(freshness?.tracking_state ?? "").toLowerCase();
  const latestOutcome = String(
    freshness?.latest_attempt_outcome ?? freshness?.last_status ?? "",
  ).toLowerCase();

  if (trackingState === "queued" || trackingState === "running") {
    return {
      title: "Atualizacao em andamento",
      description:
        freshness?.status_reason_message ??
        "A leitura atual continua disponivel enquanto o refresh acompanha a fila interna e o processamento.",
    };
  }

  if (trackingState === "stalled") {
    return {
      title: "Atualizacao sem previsao firme",
      description:
        freshness?.status_reason_message ??
        "A ultima solicitacao perdeu sinais recentes de progresso. O acompanhamento abaixo permite conferir se vale tentar de novo.",
    };
  }

  if (freshness?.has_readable_current_data && latestOutcome === "no_data") {
    return {
      title: "Leitura atual continua valida",
      description:
        freshness?.status_reason_message ??
        "A ultima tentativa nao encontrou novos demonstrativos, mas a pagina continua com uma leitura local utilizavel.",
    };
  }

  if (freshness?.has_readable_current_data) {
    return {
      title: "Dados prontos para leitura",
      description:
        "Use este controle quando quiser confirmar se houve novos demonstrativos ou atualizar a serie local desta empresa.",
    };
  }

  return {
    title: "Primeira leitura ainda pendente",
    description:
      freshness?.status_reason_message ??
      "Esta empresa ainda nao tem historico anual liberado na base local. A solicitacao abaixo dispara a primeira carga on-demand.",
  };
}

export async function CompanyFreshnessCard({
  cdCvm,
}: CompanyFreshnessCardProps) {
  let freshness = null;
  let fetchError: string | null = null;

  try {
    freshness = await fetchCompanyFreshness(cdCvm);
  } catch (error) {
    fetchError = getUserFacingErrorMessage(error);
  }

  const summary = getSummaryCopy(freshness);
  const statusBadge = getStatusBadge(freshness);
  const lastSuccessAt = freshness?.last_success_at ?? null;
  const sourceLabel = freshness?.source_label ?? "Leitura CVM processada";
  const relativeLabel = lastSuccessAt ? formatRelative(lastSuccessAt) : null;
  const absoluteLabel = lastSuccessAt ? formatAbsolute(lastSuccessAt) : null;
  const readableYearsLabel =
    freshness?.has_readable_current_data
      ? `${freshness.readable_years_count} ano${freshness.readable_years_count === 1 ? "" : "s"} anuais locais`
      : "Nenhum ano anual local";

  return (
    <SurfaceCard tone="inset" padding="md" className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.16em]",
              statusBadge.className,
            )}
          >
            {statusBadge.label}
          </span>
          <span className="rounded-full border border-border/65 px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {sourceLabel}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Estado da leitura
          </p>
          <h3 className="font-heading text-xl tracking-[-0.02em] text-foreground">
            {summary.title}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {summary.description}
          </p>
        </div>
      </div>

      <dl className="grid gap-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Leitura atual</dt>
          <dd
            className="text-right font-medium text-foreground"
            title={absoluteLabel ?? undefined}
          >
            {relativeLabel ?? "Ainda sem materializacao local"}
          </dd>
        </div>
        {absoluteLabel ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Data exata</dt>
            <dd className="text-right tabular-nums text-foreground/78">
              {absoluteLabel}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Historico local</dt>
          <dd className="text-right text-foreground">{readableYearsLabel}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Ultimo resultado</dt>
          <dd className="max-w-[18rem] text-right text-foreground/85">
            {freshness?.status_reason_message ?? "Sem tentativa recente registrada"}
          </dd>
        </div>
      </dl>

      {fetchError ? (
        <p className="text-xs leading-5 text-destructive">
          Status indisponivel: {fetchError}
        </p>
      ) : null}

      <CompanyRequestRefreshLazy cdCvm={cdCvm} initialStatus={freshness} />
    </SurfaceCard>
  );
}
