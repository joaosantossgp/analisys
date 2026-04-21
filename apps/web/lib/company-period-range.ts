export type ParsedCompanyPeriod = {
  year: number;
  quarter: 1 | 2 | 3 | 4 | null;
};

type RangeBoundary = "from" | "to";

type PeriodRangeSuccess = {
  ok: true;
  start: ParsedCompanyPeriod;
  end: ParsedCompanyPeriod;
  years: number[];
};

type PeriodRangeFailure = {
  ok: false;
  error: string;
};

export type PeriodRangeResolution = PeriodRangeSuccess | PeriodRangeFailure;

function parseQuarterToken(value: string): 1 | 2 | 3 | 4 | null {
  const parsed = Number.parseInt(value, 10);

  if (parsed >= 1 && parsed <= 4) {
    return parsed as 1 | 2 | 3 | 4;
  }

  return null;
}

export function parseCompanyPeriodInput(
  value: string,
): ParsedCompanyPeriod | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[\s/-]+/g, "").toUpperCase();
  const yearMatch = compact.match(/^(\d{4})$/);

  if (yearMatch) {
    return {
      year: Number.parseInt(yearMatch[1], 10),
      quarter: null,
    };
  }

  const prefixQuarterMatch = compact.match(/^(\d{4})([TQ])([1-4])$/);

  if (prefixQuarterMatch) {
    return {
      year: Number.parseInt(prefixQuarterMatch[1], 10),
      quarter: parseQuarterToken(prefixQuarterMatch[3]),
    };
  }

  const suffixQuarterMatch = compact.match(/^(\d{4})([1-4])([TQ])$/);

  if (suffixQuarterMatch) {
    return {
      year: Number.parseInt(suffixQuarterMatch[1], 10),
      quarter: parseQuarterToken(suffixQuarterMatch[2]),
    };
  }

  return null;
}

function toSortableIndex(
  period: ParsedCompanyPeriod,
  boundary: RangeBoundary,
): number {
  const quarter = period.quarter ?? (boundary === "from" ? 1 : 4);
  return period.year * 4 + (quarter - 1);
}

function formatAvailableRange(availableYears: number[]): string {
  const firstYear = availableYears[0];
  const lastYear = availableYears.at(-1);

  if (firstYear === undefined || lastYear === undefined) {
    return "";
  }

  return firstYear === lastYear ? `${firstYear}` : `${firstYear}-${lastYear}`;
}

export function resolveCompanyPeriodRange(
  availableYears: number[],
  fromInput: string,
  toInput: string,
): PeriodRangeResolution {
  const start = parseCompanyPeriodInput(fromInput);

  if (!start) {
    return {
      ok: false,
      error: "Use um início válido: 2022, 2022T3 ou 2022 3T.",
    };
  }

  const end = parseCompanyPeriodInput(toInput);

  if (!end) {
    return {
      ok: false,
      error: "Use um fim válido: 2024, 2024T1 ou 2024 1T.",
    };
  }

  if (toSortableIndex(start, "from") > toSortableIndex(end, "to")) {
    return {
      ok: false,
      error: "O campo De: precisa ser anterior ou igual ao campo Até:.",
    };
  }

  const years = availableYears.filter(
    (year) => year >= start.year && year <= end.year,
  );

  if (years.length === 0) {
    const availableRange = formatAvailableRange(availableYears);
    return {
      ok: false,
      error: availableRange
        ? `O intervalo precisa cobrir ao menos um ano disponível (${availableRange}).`
        : "O intervalo precisa cobrir ao menos um ano disponível.",
    };
  }

  return {
    ok: true,
    start,
    end,
    years,
  };
}
