"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CompanyHelpTip } from "@/components/company/company-help-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveCompanyPeriodRange } from "@/lib/company-period-range";
import { mergeSearchParams, serializeYears } from "@/lib/search-params";
import { track } from "@/lib/track";

type PresetValue = "3a" | "5a" | "all" | "custom";

type CompanyPeriodPresetProps = {
  pathname: string;
  availableYears: number[];
  selectedYears: number[];
  variant?: "full" | "custom-only";
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

type CustomCompanyPeriodRangeProps = {
  pathname: string;
  availableYears: number[];
  selectedYears: number[];
};

function CustomCompanyPeriodRange({
  pathname,
  availableYears,
  selectedYears,
}: CustomCompanyPeriodRangeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fromInput, setFromInput] = useState(String(selectedYears[0] ?? ""));
  const [toInput, setToInput] = useState(String(selectedYears.at(-1) ?? ""));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolution = resolveCompanyPeriodRange(
      availableYears,
      fromInput,
      toInput,
    );

    if (!resolution.ok) {
      setErrorMessage(resolution.error);
      return;
    }

    setErrorMessage(null);

    if (arraysEqual(resolution.years, selectedYears)) {
      return;
    }

    const query = mergeSearchParams(searchParams.toString(), {
      anos: serializeYears(resolution.years),
    });

    track("company_years_changed", {
      years: resolution.years.join(","),
      preset: "custom",
      range_from: fromInput.trim(),
      range_to: toInput.trim(),
    });

    startTransition(() => {
      router.push(`${pathname}?${query}`);
    });
  }

  return (
    <form
      className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            De:
          </span>
          <Input
            value={fromInput}
            onChange={(event) => {
              setFromInput(event.target.value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            placeholder="2021 ou 2021 3T"
            inputMode="text"
            aria-invalid={errorMessage ? "true" : undefined}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            AtÃ©:
          </span>
          <Input
            value={toInput}
            onChange={(event) => {
              setToInput(event.target.value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            placeholder="2024 ou 2024T1"
            inputMode="text"
            aria-invalid={errorMessage ? "true" : undefined}
          />
        </label>

        <Button type="submit" size="sm" className="rounded-full px-4">
          Aplicar
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Aceita ano ou trimestre.</span>
        <CompanyHelpTip>
          Exemplos: 2022, 2022T3 e 2022 3T. A pagina continua usando os anos cobertos pelo intervalo informado.
        </CompanyHelpTip>
        {errorMessage ? (
          <p className="ml-auto text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function CompanyPeriodPreset({
  pathname,
  availableYears,
  selectedYears,
  variant = "full",
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

  if (variant === "custom-only") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/18 px-3 py-2 text-xs text-muted-foreground">
            Periodo atual:{" "}
            <span className="font-medium text-foreground">
              {selectedYears.join(", ")}
            </span>
            <CompanyHelpTip className="size-4 border-border/60">
              O grafico, tabela e demonstracoes usam este recorte. Periodos com trimestre sao convertidos para os anos cobertos.
            </CompanyHelpTip>
          </div>
        </div>

        <CustomCompanyPeriodRange
          key={selectedYears.join(",")}
          pathname={pathname}
          availableYears={availableYears}
          selectedYears={selectedYears}
        />
      </div>
    );
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
          <CustomCompanyPeriodRange
            key={selectedYears.join(",")}
            pathname={pathname}
            availableYears={availableYears}
            selectedYears={selectedYears}
          />
        </div>
      ) : null}
    </div>
  );
}
