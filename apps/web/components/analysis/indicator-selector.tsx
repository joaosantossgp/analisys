"use client"

import * as React from "react"
import { Check, ChevronDown, Search, X, BarChart3, LineChart, AreaChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ChartType = "bar" | "line" | "area"

export interface Indicator {
  id: string
  label: string
  category: string
}

export interface SelectedIndicator {
  id: string
  chartType: ChartType
}

const CHART_TYPES: { value: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Barras", icon: BarChart3 },
  { value: "line", label: "Linha", icon: LineChart },
  { value: "area", label: "Area", icon: AreaChart },
]

const DEFAULT_INDICATORS: Indicator[] = [
  // Rentabilidade
  { id: "receita_liquida", label: "Receita Liquida", category: "Rentabilidade" },
  { id: "ebitda", label: "EBITDA", category: "Rentabilidade" },
  { id: "margem_ebitda", label: "Margem EBITDA", category: "Rentabilidade" },
  { id: "lucro_liquido", label: "Lucro Liquido", category: "Rentabilidade" },
  { id: "margem_liquida", label: "Margem Liquida", category: "Rentabilidade" },
  { id: "roe", label: "ROE", category: "Rentabilidade" },
  { id: "roa", label: "ROA", category: "Rentabilidade" },
  { id: "roic", label: "ROIC", category: "Rentabilidade" },
  // Valuation
  { id: "pl", label: "P/L", category: "Valuation" },
  { id: "pvp", label: "P/VP", category: "Valuation" },
  { id: "ev_ebitda", label: "EV/EBITDA", category: "Valuation" },
  { id: "psr", label: "P/Receita", category: "Valuation" },
  // Endividamento
  { id: "divida_ebitda", label: "Divida/EBITDA", category: "Endividamento" },
  { id: "divida_liquida_pl", label: "Divida Liquida/PL", category: "Endividamento" },
  { id: "divida_bruta", label: "Divida Bruta", category: "Endividamento" },
]

interface IndicatorSelectorProps {
  indicators?: Indicator[]
  selected: SelectedIndicator[]
  onSelectionChange: (selected: SelectedIndicator[]) => void
  maxSelections?: number
  className?: string
}

export function IndicatorSelector({
  indicators = DEFAULT_INDICATORS,
  selected,
  onSelectionChange,
  maxSelections = 5,
  className,
}: IndicatorSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedIds = React.useMemo(() => selected.map((s) => s.id), [selected])

  const filteredIndicators = React.useMemo(() => {
    if (!search.trim()) return indicators
    const query = search.toLowerCase()
    return indicators.filter(
      (ind) =>
        ind.label.toLowerCase().includes(query) ||
        ind.category.toLowerCase().includes(query)
    )
  }, [indicators, search])

  const groupedIndicators = React.useMemo(() => {
    const groups: Record<string, Indicator[]> = {}
    for (const ind of filteredIndicators) {
      if (!groups[ind.category]) {
        groups[ind.category] = []
      }
      groups[ind.category].push(ind)
    }
    return groups
  }, [filteredIndicators])

  const toggleIndicator = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selected.filter((s) => s.id !== id))
    } else if (selected.length < maxSelections) {
      onSelectionChange([...selected, { id, chartType: "bar" }])
    }
  }

  const changeChartType = (id: string, chartType: ChartType) => {
    onSelectionChange(
      selected.map((s) => (s.id === id ? { ...s, chartType } : s))
    )
  }

  const clearSelection = () => {
    onSelectionChange([])
  }

  const getSelectedIndicator = (id: string) => selected.find((s) => s.id === id)

  const selectedLabels = React.useMemo(() => {
    return selected
      .map((s) => indicators.find((ind) => ind.id === s.id)?.label)
      .filter(Boolean)
  }, [selected, indicators])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 min-w-[200px] justify-between gap-2 font-normal",
            className
          )}
        >
          <span className="truncate text-left">
            {selected.length === 0
              ? "Selecionar indicadores"
              : selected.length === 1
                ? selectedLabels[0]
                : `${selected.length} selecionados`}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0"
        align="start"
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar indicador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-1">
          {Object.entries(groupedIndicators).map(([category, items]) => (
            <div key={category} className="mb-1">
              <div className="px-2 py-1.5">
                <span className="eyebrow">{category}</span>
              </div>
              {items.map((indicator) => {
                const isSelected = selectedIds.includes(indicator.id)
                const isDisabled = !isSelected && selected.length >= maxSelections
                const selectedItem = getSelectedIndicator(indicator.id)

                return (
                  <div
                    key={indicator.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                      "hover:bg-accent",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleIndicator(indicator.id)}
                      disabled={isDisabled}
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-chart-1 bg-chart-1 text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {isSelected && <Check className="size-3" strokeWidth={3} />}
                    </button>

                    {/* Label */}
                    <span
                      className={cn(
                        "flex-1 cursor-pointer text-left text-sm",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      )}
                      onClick={() => !isDisabled && toggleIndicator(indicator.id)}
                    >
                      {indicator.label}
                    </span>

                    {/* Chart Type Selector - only show when selected */}
                    {isSelected && selectedItem && (
                      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5">
                        {CHART_TYPES.map((ct) => {
                          const Icon = ct.icon
                          const isActive = selectedItem.chartType === ct.value
                          return (
                            <button
                              key={ct.value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                changeChartType(indicator.id, ct.value)
                              }}
                              title={ct.label}
                              className={cn(
                                "flex size-6 items-center justify-center rounded transition-colors",
                                isActive
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Icon className="size-3.5" />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {Object.keys(groupedIndicators).length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum indicador encontrado
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selected.length}/{maxSelections} selecionados
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
              Limpar
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DEFAULT_INDICATORS }
