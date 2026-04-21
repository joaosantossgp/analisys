import { CompanyRequestRefreshLazy } from "@/components/company/company-request-refresh-lazy";
import { SurfaceCard } from "@/components/shared/design-system-recipes";
import {
  fetchCompanyFreshness,
  getUserFacingErrorMessage,
} from "@/lib/api";

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

  const lastSuccessAt = freshness?.last_success_at ?? null;
  const sourceLabel = freshness?.source_scope ?? "CVM (DFP / ITR)";
  const relativeLabel = lastSuccessAt ? formatRelative(lastSuccessAt) : null;
  const absoluteLabel = lastSuccessAt ? formatAbsolute(lastSuccessAt) : null;

  return (
    <SurfaceCard tone="inset" padding="md" className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Atualizacao dos dados
        </p>
        <h3 className="font-heading text-xl tracking-[-0.02em] text-foreground">
          Dispare uma nova leitura da CVM
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Use este CTA quando precisar dos demonstrativos mais recentes
          divulgados pela CVM.
        </p>
      </div>

      <dl className="grid gap-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Ultima leitura</dt>
          <dd
            className="text-right font-medium text-foreground"
            title={absoluteLabel ?? undefined}
          >
            {relativeLabel ?? "Sem leitura previa"}
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
          <dt className="text-muted-foreground">Fonte</dt>
          <dd className="text-right text-foreground">{sourceLabel}</dd>
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
