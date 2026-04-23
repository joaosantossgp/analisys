"use client"

import * as React from "react"
import { IndicatorSelector } from "@/components/analysis/indicator-selector"
import { DateRangePicker } from "@/components/analysis/date-range-picker"
import type { DateRange } from "react-day-picker"

export default function DemoAnalysisPage() {
  const [selectedIndicators, setSelectedIndicators] = React.useState<string[]>([
    "receita_liquida",
    "margem_ebitda",
  ])
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2020, 0, 1),
    to: new Date(),
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Componentes de Análise
          </h1>
          <p className="mt-1 text-muted-foreground">
            Demonstração dos componentes de seleção de indicadores e período.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-medium">
            Seletor de Indicadores
          </h2>
          <div className="space-y-4">
            <IndicatorSelector
              selected={selectedIndicators}
              onSelectionChange={setSelectedIndicators}
              maxSelections={5}
            />
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Selecionados: </span>
              <span className="font-mono">
                {JSON.stringify(selectedIndicators)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-medium">
            Seletor de Período
          </h2>
          <div className="space-y-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              minDate={new Date(2010, 0, 1)}
              maxDate={new Date()}
            />
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Período: </span>
              <span className="font-mono">
                {dateRange?.from?.toLocaleDateString("pt-BR")} -{" "}
                {dateRange?.to?.toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-medium">
            Uso Combinado
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Como ficaria o painel de análise de indicadores com os dois
            componentes lado a lado.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <IndicatorSelector
              selected={selectedIndicators}
              onSelectionChange={setSelectedIndicators}
            />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>
    </div>
  )
}
