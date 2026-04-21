"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CompanyYearSelector } from "@/components/company/company-year-selector";
import { Button } from "@/components/ui/button";
import { mergeSearchParams, serializeYears } from "@/lib/search-params";
import { track } from "@/lib/track";

type PresetValue = "3a" | "5a" | "all" | "custom";

type CompanyPeriodPresetProps = {
  pathname: string;
  availableYears: number[];
  selectedYears: number[];
};

const PRESET_OPTIONS: Array<{
  value: PresetValue;
  label: string;
  minYears?: number;
}> = [
  { value: "3a", label: "3A", minYears: 3 },
  { value: "5a", label: "5A", minYears: 5 },
  { value: "all", label: "Todos" },
  { value: "custom", label: "Personalizado" },
];

function arraysEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function getLastNYears(years: number[], count: number): number[] {
  return years.slice(Math.max(0, years.length - count));
}

function detectPreset(
  availableYears: number[],
  selectedYears: number[],
): PresetValue {
  if (arraysEqual(availableYears, selectedYears)) {
    return "all";
  }

  if (
    availableYears.length >= 3 &&
    arraysEqual(getLastNYears(availableYears, 3), selectedYears)
  ) {
    return "3a";
  }

  if (
    availableYears.length >= 5 &&
    arraysEqual(getLastNYears(availableYears, 5), selectedYears)
  ) {
    return "5a";
  }

  return "custom";
}

function resolvePresetYears(
  preset: Exclude<PresetValue, "custom">,
  availableYears: number[],
): number[] {
  switch (preset) {
    case "3a":
      return getLastNYears(availableYears, 3);
    case "5a":
      return getLastNYears(availableYears, 5);
    case "all":
      return availableYears;
  }
}

export function CompanyPeriodPreset({
  pathname,
  availableYears,
  selectedYears,
}: CompanyPeriodPresetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const derivedPreset = detectPreset(availableYears, selectedYears);
  const [customLocked, setCustomLocked] = useState(derivedPreset === "custom");
  const activePreset: PresetValue = customLocked ? "custom" : derivedPreset;

  function applyPreset(nextPreset: PresetValue) {
    if (nextPreset === "custom") {
      setCustomLocked(true);
      return;
    }

    setCustomLocked(false);
    const nextYears = resolvePresetYears(nextPreset, availableYears);

    if (arraysEqual(nextYears, selectedYears)) {
      return;
    }

    const query = mergeSearchParams(searchParams.toString(), {
      anos: serializeYears(nextYears),
    });

    track("company_years_changed", {
      years: nextYears.join(","),
      preset: nextPreset,
    });

    startTransition(() => {
      router.push(`${pathname}?${query}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Periodo
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((option) => {
            const active = option.value === activePreset;
            const disabled =
              option.minYears !== undefined &&
              availableYears.length < option.minYears;

            return (
              <Button
                key={option.value}
                type="button"
                variant={active ? "secondary" : "outline"}
                size="sm"
                className="rounded-full px-4"
                disabled={disabled}
                onClick={() => applyPreset(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {activePreset === "custom" ? (
        <div className="px-1">
          <CompanyYearSelector
            pathname={pathname}
            availableYears={availableYears}
            selectedYears={selectedYears}
          />
        </div>
      ) : null}
    </div>
  );
}
