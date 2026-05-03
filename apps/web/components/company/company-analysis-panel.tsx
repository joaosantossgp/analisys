"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchIcon } from "lucide-react";

import { IndicatorSelector } from "@/components/analysis/indicator-selector";
import { CompanyAnalysisChart } from "@/components/company/company-analysis-chart";
import { CompanyHelpTip } from "@/components/company/company-help-tip";
import { SurfaceCard } from "@/components/shared/design-system-recipes";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CompanyDashboardModel,
  DashboardSelectedIndicator,
} from "@/lib/company-dashboard";
import { formatKpiDelta, formatKpiValue } from "@/lib/formatters";

type CompanyAnalysisPanelProps = {
  model: CompanyDashboardModel;
  periodControl?: ReactNode;
};

export function CompanyAnalysisPanel({
  model,
  periodControl,
}: CompanyAnalysisPanelProps) {
  const [selectedIndicators, setSelectedIndicators] = useState<DashboardSelectedIndicator[]>(
    model.defaultSelectedIndicators,
  );
  const [search, setSearch] = useState("");
  const effectiveSelectedIndicators = useMemo(() => {
    const validIds = new Set(model.indicatorOptions.map((indicator) => indicator.id));
    const filteredSelection = selectedIndicators.filter((indicator) =>
      validIds.has(indicator.id),
    );

    if (filteredSelection.length > 0) {
      return filteredSelection;
    }

    return model.defaultSelectedIndicators;
  }, [model.defaultSelectedIndicators, model.indicatorOptions, selectedIndicators]);

  const selectedIds = useMemo(
    () => new Set(effectiveSelectedIndicators.map((indicator) => indicator.id)),
    [effectiveSelectedIndicators],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...model.tableRows]
      .filter((row) => {
        if (!query) {
          return true;
        }

        return (
          row.label.toLowerCase().includes(query) ||
          row.category.toLowerCase().includes(query)
        );
      })
      .sort((left, right) => {
        const leftSelected = selectedIds.has(left.id) ? 0 : 1;
        const rightSelected = selectedIds.has(right.id) ? 0 : 1;
        if (leftSelected !== rightSelected) {
          return leftSelected - rightSelected;
        }

        return left.label.localeCompare(right.label);
      });
  }, [model.tableRows, search, selectedIds]);

  return (
    <SurfaceCard tone="default" padding="lg" className="space-y-6" data-testid="company-analysis-panel">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Analise de indicadores
            </p>
            <CompanyHelpTip>
              Escolha ate 5 indicadores para o grafico. O recorte anual usado aqui tambem vale para a pagina.
            </CompanyHelpTip>
          </div>
          <h2 className="font-heading text-[1.5rem] tracking-[-0.03em] text-foreground">
            Visao anual
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <IndicatorSelector
            indicators={model.indicatorOptions}
            selected={effectiveSelectedIndicators}
            onSelectionChange={setSelectedIndicators}
            maxSelections={5}
            className="min-w-[220px]"
          />
          {periodControl}
        </div>
      </div>

      <CompanyAnalysisChart
        chartSeries={model.chartSeries}
        selectedIndicators={effectiveSelectedIndicators}
      />

      <div className="space-y-4 rounded-[1.35rem] border border-border/60 bg-muted/16 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Tabela anual
            </p>
            <CompanyHelpTip>
              Indicadores selecionados sobem para o topo. Use o filtro para achar indicador ou categoria.
            </CompanyHelpTip>
          </div>
          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar indicador ou categoria..."
              className="h-10 rounded-full border-border/60 bg-background pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-[1.15rem] border border-border/60 bg-background/82">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead>Categoria</TableHead>
                {model.years.map((year) => (
                  <TableHead key={year} className="text-right">
                    {year}
                  </TableHead>
                ))}
                <TableHead className="text-right">Delta YoY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} data-selected={selectedIds.has(row.id) || undefined}>
                  <TableCell className="min-w-[14rem] font-medium text-foreground">
                    {row.label}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.category}</TableCell>
                  {model.years.map((year) => (
                    <TableCell key={`${row.id}-${year}`} className="text-right font-mono">
                      {formatKpiValue(row.valuesByYear[year], row.formatType)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatKpiDelta(row.delta, row.formatType)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={model.years.length + 3}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum indicador apareceu com esse filtro.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </SurfaceCard>
  );
}
