"use client";

import { startTransition, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { StatementMatrix, TabularDataRow } from "@/lib/api";
import { isStatementSubtotal, STATEMENT_OPTIONS } from "@/lib/constants";
import { formatStatementValue } from "@/lib/formatters";
import { mergeSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type CompanyStatementsProps = {
  matrix: StatementMatrix;
};

const META_COLS = new Set([
  "CD_CONTA",
  "DS_CONTA",
  "STANDARD_NAME",
  "LINE_ID_BASE",
  "DELTA_YOY",
  "LEVEL",
  "IS_TOTAL",
  "IS_PLACEHOLDER",
]);

function fmtMM(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const mm = abs * 1000;
  if (mm >= 1_000_000_000)
    return sign + (mm / 1_000_000_000).toFixed(1).replace(".", ",") + " T";
  if (mm >= 1_000_000)
    return sign + (mm / 1_000_000).toFixed(1).replace(".", ",") + " B";
  if (mm >= 1_000)
    return sign + (mm / 1_000).toFixed(1).replace(".", ",") + " M";
  return sign + mm.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

type StatementRowProps = {
  row: TabularDataRow;
  yearColumns: string[];
  showYoY: boolean;
  isLastYear: (col: string) => boolean;
  statementType: string;
};

function getStatementRowKey(row: TabularDataRow, index: number): string {
  return String(
    row.LINE_ID_BASE ??
      row.CD_CONTA ??
      row.STANDARD_NAME ??
      row.DS_CONTA ??
      `statement-row-${index}`,
  );
}

function StatementRow({
  row,
  yearColumns,
  showYoY,
  isLastYear,
  statementType,
}: StatementRowProps) {
  const accountCode = String(row.CD_CONTA ?? "");
  const isSubtotal = isStatementSubtotal(statementType, accountCode);
  const level = Number(row.LEVEL ?? 0);
  const indent = 16 + level * 16;
  const delta =
    row.DELTA_YOY === null || row.DELTA_YOY === undefined
      ? null
      : Number(row.DELTA_YOY);
  const isDeltaPos = delta !== null && delta >= 0;

  return (
    <tr
      className={cn(
        "border-b border-border/40 transition-colors",
        isSubtotal ? "bg-primary/[0.03]" : "hover:bg-muted/20",
      )}
    >
      <td
        className="sticky left-0 z-10 min-w-72 bg-inherit py-2.5 align-top"
        style={{ paddingLeft: `${indent}px`, paddingRight: "16px" }}
      >
        <div className="space-y-0.5">
          <p
            className={cn(
              "leading-tight",
              isSubtotal
                ? "font-semibold text-sm text-foreground"
                : "text-[0.82rem] text-muted-foreground",
            )}
          >
            {accountCode ? `${accountCode} ` : ""}
            {String(row.DS_CONTA ?? "Conta")}
          </p>
          {row.STANDARD_NAME && row.STANDARD_NAME !== row.DS_CONTA ? (
            <p className="text-[0.68rem] uppercase tracking-[0.1em] text-muted-foreground/60">
              {String(row.STANDARD_NAME)}
            </p>
          ) : null}
        </div>
      </td>

      {yearColumns.map((col) => {
        const rawValue = row[col];
        const numericValue =
          rawValue === null || rawValue === undefined ? null : Number(rawValue);
        const isNeg = numericValue !== null && numericValue < 0;

        return (
          <td
            key={col}
            className={cn(
              "py-2.5 px-3 text-right font-mono text-[0.82rem] tnum tabular-nums",
              isNeg ? "text-destructive" : "text-foreground",
              isSubtotal ? "font-semibold" : "",
              isLastYear(col) ? "text-foreground font-medium" : "",
            )}
          >
            {numericValue === null || isNaN(numericValue)
              ? "—"
              : fmtMM(numericValue)}
          </td>
        );
      })}

      {showYoY ? (
        <td className="py-2.5 px-3 text-right text-[0.82rem] tabular-nums">
          {delta === null ? (
            <span className="text-muted-foreground/50">—</span>
          ) : (
            <span className={isDeltaPos ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
              {isDeltaPos ? "+" : ""}
              {(delta * 100).toFixed(1)}%
            </span>
          )}
        </td>
      ) : null}
    </tr>
  );
}

export function CompanyStatements({ matrix }: CompanyStatementsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [showYoY, setShowYoY] = useState(false);

  const currentStmt = matrix.statement_type;
  const yearColumns = matrix.table.columns.filter((c) => !META_COLS.has(c));
  const lastYearCol = yearColumns.at(-1);
  const rows = (matrix.table.rows as TabularDataRow[]).filter(
    (row) => !Boolean(row.IS_PLACEHOLDER),
  );

  const filteredRows = search.trim()
    ? rows.filter((row) =>
        String(row.DS_CONTA ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : rows;

  function navigateTo(stmt: string) {
    const query = mergeSearchParams(searchParams.toString(), { stmt });
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  if (rows.length === 0) {
    return (
      <SurfaceCard tone="muted" padding="hero" className="items-center text-center">
        <p className="font-heading text-2xl text-foreground">
          Sem demonstração disponível.
        </p>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          Ajuste o período selecionado ou troque o tipo de demonstração para
          consultar outra visão disponível.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-border/60">
        {STATEMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => navigateTo(opt.value)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors -mb-px",
              currentStmt === opt.value
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[1rem] border border-border/60 bg-muted/40 px-3 py-1.5">
            <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar linha…"
              className="h-auto w-40 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={showYoY}
              onCheckedChange={(checked) => setShowYoY(Boolean(checked))}
            />
            Mostrar variação
          </label>
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredRows.length} linhas · valores em R$ milhões
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-medium text-muted-foreground w-[40%]">
                Conta
              </th>
              {yearColumns.map((col) => (
                <th
                  key={col}
                  className={cn(
                    "px-3 py-3 text-right font-mono font-medium tabular-nums",
                    col === lastYearCol ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {col}
                </th>
              ))}
              {showYoY ? (
                <th className="px-3 py-3 text-right font-medium text-muted-foreground">
                  Δ YoY
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <StatementRow
                key={getStatementRowKey(row, index)}
                row={row}
                yearColumns={yearColumns}
                showYoY={showYoY}
                isLastYear={(col) => col === lastYearCol}
                statementType={currentStmt}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs italic text-muted-foreground">
        Fonte: CVM · DFP/ITR consolidados. Linhas em destaque são totalizadoras.
        Valores em R$ milhões, sem ajuste de inflação.
      </p>
    </div>
  );
}
