"use client";

import { useEffect, useState } from "react";

import { TrustStrip } from "@/components/home/trust-strip";
import type { HealthResponse } from "@/lib/api";

type HomeTrustStripProps = {
  totalCompanies: number | null;
};

export function HomeTrustStrip({ totalCompanies }: HomeTrustStripProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadHealth = async () => {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setHealth(null);
          }
          return;
        }

        const payload = (await response.json()) as HealthResponse;
        if (!controller.signal.aborted) {
          setHealth(payload);
        }
      } catch {
        if (!controller.signal.aborted) {
          setHealth(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setHealthLoading(false);
        }
      }
    };

    void loadHealth();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <TrustStrip
      health={health}
      totalCompanies={totalCompanies}
      healthLoading={healthLoading}
    />
  );
}
