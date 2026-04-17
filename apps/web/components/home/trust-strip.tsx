import { Building2, FileText, BarChart3, RefreshCw } from "lucide-react";

import type { HealthResponse } from "@/lib/api";
import { formatCompactInteger } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type TrustStripProps = {
  health: HealthResponse | null;
  totalCompanies: number | null;
};

export function TrustStrip({ health, totalCompanies }: TrustStripProps) {
  const isOnline = health?.status === "ok";

  const metrics = [
    {
      icon: Building2,
      label: "Companhias",
      value: formatCompactInteger(totalCompanies),
      pulse: false,
    },
    {
      icon: FileText,
      label: "Demonstrações",
      value: "1,7 M",
      pulse: false,
    },
    {
      icon: BarChart3,
      label: "KPIs",
      value: "60+",
      pulse: false,
    },
    {
      icon: RefreshCw,
      label: "Atualizado",
      value: isOnline ? "Agora" : "Indisponível",
      pulse: isOnline,
    },
  ] as const;

  return (
    <div className="border-y border-border/60 bg-background/72 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-8 px-4 py-5 sm:px-6 lg:px-10 xl:justify-between">
        {metrics.map(({ icon: Icon, label, value, pulse }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon
              className={cn(
                "size-4 text-muted-foreground",
                pulse && "animate-spin",
              )}
            />
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
