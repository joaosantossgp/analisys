"use client";

import { useEffect } from "react";

import {
  InfoChip,
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/shared/design-system-recipes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getUserFacingErrorCopy } from "@/lib/api";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const copy = getUserFacingErrorCopy(error);

  return (
    <PageShell density="relaxed" className="max-w-4xl">
      <SurfaceCard tone="hero" padding="hero" className="space-y-6">
        <InfoChip tone="muted">Erro de servico</InfoChip>
        <SectionHeading title={copy.title} titleAs="h1" />
        <Alert variant="destructive-soft">
          <AlertTitle>Falha controlada da camada web</AlertTitle>
          <AlertDescription>{copy.message}</AlertDescription>
        </Alert>
        <div>
          <Button size="lg" className="rounded-full px-5" onClick={() => reset()}>
            Tentar novamente
          </Button>
        </div>
      </SurfaceCard>
    </PageShell>
  );
}
