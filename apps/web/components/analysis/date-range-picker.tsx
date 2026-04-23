"use client"

import * as React from "react"
import { format, subMonths, subYears, startOfYear, endOfYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
  minDate?: Date
  maxDate?: Date
}

type PresetKey = "12m" | "3y" | "5y" | "10y" | "max"

interface Preset {
  label: string
  getValue: () => DateRange
}

const getPresets = (minDate?: Date): Record<PresetKey, Preset> => {
  const today = new Date()
  const effectiveMinDate = minDate ?? new Date(2000, 0, 1)

  return {
    "12m": {
      label: "12M",
      getValue: () => ({
        from: subMonths(today, 12),
        to: today,
      }),
    },
    "3y": {
      label: "3A",
      getValue: () => ({
        from: subYears(today, 3),
        to: today,
      }),
    },
    "5y": {
      label: "5A",
      getValue: () => ({
        from: subYears(today, 5),
        to: today,
      }),
    },
    "10y": {
      label: "10A",
      getValue: () => ({
        from: subYears(today, 10),
        to: today,
      }),
    },
    max: {
      label: "Máx",
      getValue: () => ({
        from: effectiveMinDate,
        to: today,
      }),
    },
  }
}

export function DateRangePicker({
  value,
  onChange,
  className,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [activePreset, setActivePreset] = React.useState<PresetKey | null>(null)

  const presets = React.useMemo(() => getPresets(minDate), [minDate])

  const handlePresetClick = (key: PresetKey) => {
    const preset = presets[key]
    const range = preset.getValue()
    onChange(range)
    setActivePreset(key)
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange(range)
    setActivePreset(null)
  }

  const formatDateRange = () => {
    if (!value?.from) return "Selecionar período"
    if (!value.to) return format(value.from, "dd/MM/yyyy", { locale: ptBR })
    return `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 min-w-[220px] justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          {/* Atalhos rápidos */}
          <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
            <span className="mb-1 w-full text-xs text-muted-foreground">
              Atalhos rápidos
            </span>
            {(Object.keys(presets) as PresetKey[]).map((key) => (
              <Button
                key={key}
                variant={activePreset === key ? "default" : "outline"}
                size="xs"
                onClick={() => handlePresetClick(key)}
                className="h-7 px-2.5 text-xs"
              >
                {presets[key].label}
              </Button>
            ))}
          </div>

          {/* Calendário */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(date) => {
                if (minDate && date < minDate) return true
                if (maxDate && date > maxDate) return true
                return false
              }}
              defaultMonth={value?.from ?? subMonths(new Date(), 1)}
            />
          </div>

          {/* Footer com período selecionado */}
          {value?.from && value?.to && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>De:</span>
                <span className="font-medium text-foreground">
                  {format(value.from, "dd MMM yyyy", { locale: ptBR })}
                </span>
                <span>Até:</span>
                <span className="font-medium text-foreground">
                  {format(value.to, "dd MMM yyyy", { locale: ptBR })}
                </span>
              </div>
              <Button
                size="xs"
                onClick={() => setOpen(false)}
                className="h-7"
              >
                Aplicar
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
