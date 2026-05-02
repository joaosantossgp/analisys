import { CompanyRequestRefreshLazy } from "@/components/company/company-request-refresh-lazy";
import { CompanyHelpTip } from "@/components/company/company-help-tip";
import { SurfaceCard } from "@/components/shared/design-system-recipes";
import {
  fetchCompanyFreshness,
  getUserFacingErrorMessage,
  type RefreshStatusItem,
} from "@/lib/api";
import {
  type FreshnessBadgeTone,
  getCompanyFreshnessCopy,
} from "@/lib/company-refresh-state";
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

function getStatusBadgeClassName(tone: FreshnessBadgeTone): string {
  switch (tone) {
    case "active":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "ready":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "warning":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "neutral":
      return "border-border/70 bg-muted/55 text-muted-foreground";
    default:
      return "border-primary/20 bg-primary/8 text-primary/80";
  }
}

export async function CompanyFreshnessCard({
  cdCvm,
}: CompanyFreshnessCardProps) {
  let freshness: RefreshStatusItem | null = null;
  let fetchError: string | null = null;

  try {
    freshness = await fetchCompanyFreshness(cdCvm);
  } catch (error) {
    fetchError = getUserFacingErrorMessage(error);
  }

  const summary = getCompanyFreshnessCopy(freshness);
  const materializedAt =
    freshness?.read_model_updated_at ?? freshness?.last_success_at ?? null;
  const sourceLabel = freshness?.source_label ?? "Leitura CVM processada";
  const relativeLabel = materializedAt ? formatRelative(materializedAt) : null;
  const absoluteLabel = materializedAt ? formatAbsolute(materializedAt) : null;
  const readableYearsLabel =
    freshness?.has_readable_current_data
      ? `${freshness.readable_years_count} ano${freshness.readable_years_count === 1 ? "" : "s"} anuais locais${
          freshness.latest_readable_year
            ? `, ultimo ${freshness.latest_readable_year}`
            : ""
        }`
      : "Nenhum ano anual local";

  return (
    <SurfaceCard tone="inset" padding="md" className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.16em]",
              getStatusBadgeClassName(summary.badgeTone),
            )}
          >
            {summary.badgeLabel}
          </span>
          <span className="rounded-full border border-border/65 px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {sourceLabel}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Estado da leitura
            </p>
            <CompanyHelpTip>{summary.description}</CompanyHelpTip>
          </div>
          <h3 className="font-heading text-xl tracking-[-0.02em] text-foreground">
            {summary.title}
          </h3>
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
          <dt className="text-muted-foreground">{summary.latestResultLabel}</dt>
          <dd className="max-w-[18rem] text-right text-foreground/85">
            {summary.latestResultDescription}
          </dd>
        </div>
        {summary.retryHint ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Proximo passo</dt>
            <dd className="max-w-[18rem] text-right text-foreground/85">
              {summary.retryHint}
            </dd>
          </div>
        ) : null}
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
