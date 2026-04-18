"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ChronoSelectProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  /** Inclusive year range for the year jump selector, e.g. [2000, 2030] */
  yearRange?: [number, number];
}

export function ChronoSelect({
  value,
  onChange,
  placeholder = "Selecionar data",
  className,
  yearRange = [1970, 2050],
}: ChronoSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Date | undefined>(value);
  const [month, setMonth] = React.useState<Date>(selected ?? new Date());

  const years = React.useMemo(() => {
    const [start, end] = yearRange;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [yearRange]);

  const handleSelect = (date: Date | undefined) => {
    setSelected(date);
    setOpen(false);
    onChange?.(date);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(e.target.value, 10));
    setMonth(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* PopoverTrigger renders a <button> — styled with buttonVariants directly */}
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-[240px] justify-start gap-2 text-left font-normal",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="size-4 shrink-0" />
        {selected ? format(selected, "dd/MM/yyyy") : placeholder}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto space-y-2 p-3">
        {/* Year jump + month label */}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-sm font-medium text-foreground">
            {format(month, "MMMM")}
          </span>
          <select
            value={String(month.getFullYear())}
            onChange={handleYearChange}
            className={cn(
              "h-7 w-[88px] cursor-pointer rounded-md border border-input bg-background px-2",
              "text-xs text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring/50",
            )}
          >
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
        />
      </PopoverContent>
    </Popover>
  );
}
