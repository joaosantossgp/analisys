"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChartIcon,
  BarChart3Icon,
  LineChartIcon,
  SearchIcon,
} from "lucide-react";

import { IndicatorSelector } from "@/components/analysis/indicator-selector";
import { CompanyAnalysisChart } from "@/components/company/company-analysis-chart";
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
};

function getChartIcon(chartType: DashboardSelectedIndicator["chartType"]) {
  switch (chartType) {
    case "line":
      return LineChartIcon;
    case "area":
      return AreaChartIcon;
    default:
      return BarChart3Icon;
  }
}

export function CompanyAnalysisPanel({ model }: CompanyAnalysisPanelProps) {
  const [selectedIndicators, setSelectedIndicators] = useState<DashboardSelectedIndicator[]>(
    model.defaultSelectedIndicators,
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    const validIds = new Set(model.indicatorOptions.map((indicator) => indicator.id));
    const nextSelection = selectedIndicators.filter((indicator) =>
      validIds.has(indicator.id),
    );

    if (nextSelection.length > 0) {
      if (nextSelection.length !== selectedIndicators.length) {
        setSelectedIndicators(nextSelection);
      }
      return;
    }

    setSelectedIndicators(model.defaultSelectedIndicators);
  }, [model.defaultSelectedIndicators, model.indicatorOptions, selectedIndicators]);

  const selectedIds = useMemo(
    () => new Set(selectedIndicators.map((indicator) => indicator.id)),
    [selectedIndicators],
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Analise de indicadores
          </p>
          <h2 className="font-heading text-[1.5rem] tracking-[-0.03em] text-foreground">
            Visao anual em um unico painel
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Escolha os indicadores que entram no grafico e compare o mesmo recorte
            anual aplicado a esta pagina.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IndicatorSelector
            indicators={model.indicatorOptions}
            selected={selectedIndicators}
            onSelectionChange={setSelectedIndicators}
            maxSelections={5}
            className="min-w-[220px]"
          />
          <div className="rounded-full border border-border/60 bg-muted/18 px-3 py-2 text-xs text-muted-foreground">
            Periodo atual: <span className="font-medium text-foreground">{model.yearsLabel}</span>
          </div>
        </div>
      </div>

      {selectedIndicators.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedIndicators.map((indicator) => {
            const option = model.indicatorOptions.find((item) => item.id === indicator.id);
            if (!option) {
              return null;
            }

            const ChartIcon = getChartIcon(indicator.chartType);
            return (
              <div
                key={indicator.id}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/18 px-3 py-1.5 text-xs"
              >
                <span className="font-medium text-foreground">{option.label}</span>
                <ChartIcon className="size-3.5 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      ) : null}

      <CompanyAnalysisChart
        chartSeries={model.chartSeries}
        selectedIndicators={selectedIndicators}
      />

      <div className="space-y-4 rounded-[1.35rem] border border-border/60 bg-muted/16 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Tabela anual
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Indicadores visiveis neste recorte. Os selecionados no grafico sobem
              para o topo.
            </p>
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
