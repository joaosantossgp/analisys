"use client"

import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface Indicator {
  id: string
  label: string
  category: string
}

const DEFAULT_INDICATORS: Indicator[] = [
  // Rentabilidade
  { id: "receita_liquida", label: "Receita Líquida", category: "Rentabilidade" },
  { id: "ebitda", label: "EBITDA", category: "Rentabilidade" },
  { id: "margem_ebitda", label: "Margem EBITDA", category: "Rentabilidade" },
  { id: "lucro_liquido", label: "Lucro Líquido", category: "Rentabilidade" },
  { id: "margem_liquida", label: "Margem Líquida", category: "Rentabilidade" },
  { id: "roe", label: "ROE", category: "Rentabilidade" },
  { id: "roa", label: "ROA", category: "Rentabilidade" },
  { id: "roic", label: "ROIC", category: "Rentabilidade" },
  // Valuation
  { id: "pl", label: "P/L", category: "Valuation" },
  { id: "pvp", label: "P/VP", category: "Valuation" },
  { id: "ev_ebitda", label: "EV/EBITDA", category: "Valuation" },
  { id: "psr", label: "P/Receita", category: "Valuation" },
  // Endividamento
  { id: "divida_ebitda", label: "Dívida/EBITDA", category: "Endividamento" },
  { id: "divida_liquida_pl", label: "Dívida Líquida/PL", category: "Endividamento" },
  { id: "divida_bruta", label: "Dívida Bruta", category: "Endividamento" },
]

interface IndicatorSelectorProps {
  indicators?: Indicator[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
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
    if (selected.includes(id)) {
      onSelectionChange(selected.filter((s) => s !== id))
    } else if (selected.length < maxSelections) {
      onSelectionChange([...selected, id])
    }
  }

  const clearSelection = () => {
    onSelectionChange([])
  }

  const selectedLabels = React.useMemo(() => {
    return selected
      .map((id) => indicators.find((ind) => ind.id === id)?.label)
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
        className="w-[280px] p-0"
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

        <div className="max-h-[280px] overflow-y-auto p-1">
          {Object.entries(groupedIndicators).map(([category, items]) => (
            <div key={category} className="mb-1">
              <div className="px-2 py-1.5">
                <span className="eyebrow">{category}</span>
              </div>
              {items.map((indicator) => {
                const isSelected = selected.includes(indicator.id)
                const isDisabled = !isSelected && selected.length >= maxSelections

                return (
                  <button
                    key={indicator.id}
                    type="button"
                    onClick={() => toggleIndicator(indicator.id)}
                    disabled={isDisabled}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-accent focus:bg-accent focus:outline-none",
                      isSelected && "text-foreground",
                      !isSelected && "text-muted-foreground",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-chart-1 bg-chart-1 text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {isSelected && <Check className="size-3" strokeWidth={3} />}
                    </div>
                    <span className="flex-1 text-left">{indicator.label}</span>
                  </button>
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
