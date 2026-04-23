"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import {
  ArrowUpRight,
  Bell,
  Download,
  ExternalLink,
  MessageSquare,
  Search,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  X,
  BarChart3,
  LineChart,
  AreaChart,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PageShell,
  SurfaceCard,
  InfoChip,
} from "@/components/shared/design-system-recipes"
import { IndicatorSelector, type SelectedIndicator, type ChartType } from "@/components/analysis/indicator-selector"
import { DateRangePicker } from "@/components/analysis/date-range-picker"

// Mock data
const COMPANY_DATA = {
  name: "APPLE INC.",
  ticker: "AAPL",
  sector: "Tecnologia",
  cnpj: "00.000.000/0001-00",
  tags: ["Large Cap", "S&P 500", "NASDAQ"],
}

const STOCK_DATA = {
  price: 182.52,
  change: 2.4,
  history: [165, 170, 168, 175, 180, 178, 182, 185, 180, 183],
}

const FINANCIAL_DATA = [
  { year: 2020, receita_liquida: 274500, ebitda: 77300, margem_ebitda: 28.2, lucro_liquido: 57400, roe: 73.7, pl: 35.2 },
  { year: 2021, receita_liquida: 365800, ebitda: 120200, margem_ebitda: 32.9, lucro_liquido: 94680, roe: 147.4, pl: 28.7 },
  { year: 2022, receita_liquida: 394300, ebitda: 130900, margem_ebitda: 33.2, lucro_liquido: 99800, roe: 175.5, pl: 24.8 },
  { year: 2023, receita_liquida: 383300, ebitda: 125800, margem_ebitda: 32.8, lucro_liquido: 97000, roe: 156.1, pl: 29.5 },
  { year: 2024, receita_liquida: 410500, ebitda: 138200, margem_ebitda: 33.7, lucro_liquido: 105200, roe: 161.8, pl: 31.2 },
]

const TABLE_DATA = [
  { year: 2024, receita: "$410.5B", ebitda: "$138.2B", margem: "33.7%" },
  { year: 2023, receita: "$383.3B", ebitda: "$125.8B", margem: "32.8%" },
  { year: 2022, receita: "$394.3B", ebitda: "$130.9B", margem: "33.2%" },
  { year: 2021, receita: "$365.8B", ebitda: "$120.2B", margem: "32.9%" },
  { year: 2020, receita: "$274.5B", ebitda: "$77.3B", margem: "28.2%" },
]

const NEWS_DATA = [
  {
    id: 1,
    type: "news",
    title: "Apple anuncia novo chip M4 Pro",
    time: "Ha 2 horas",
    category: "Tech",
  },
  {
    id: 2,
    type: "alert",
    title: "Alerta: Resultados do trimestre",
    time: "Ha 3 horas",
  },
  {
    id: 3,
    type: "review",
    title: "Revisao positiva de analistas Goldman",
    time: "Ha 5 horas",
  },
]

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const INDICATOR_LABELS: Record<string, string> = {
  receita_liquida: "Receita Liquida",
  ebitda: "EBITDA",
  margem_ebitda: "Margem EBITDA",
  lucro_liquido: "Lucro Liquido",
  roe: "ROE",
  pl: "P/L",
}

// Mini sparkline component for stock card
function MiniSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((v - min) / range) * 100
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg viewBox="0 0 100 50" className="h-10 w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Multi-indicator chart component with per-indicator chart type
function IndicatorChart({
  data,
  selectedIndicators,
}: {
  data: typeof FINANCIAL_DATA
  selectedIndicators: SelectedIndicator[]
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  const W = 700
  const H = 260
  const PAD = { top: 30, right: 60, bottom: 40, left: 70 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  // Calculate max values for each indicator to determine scale
  const indicatorStats = React.useMemo(() => {
    const stats: Record<string, { max: number; isPercentage: boolean }> = {}
    for (const ind of selectedIndicators) {
      const values = data.map((d) => (d as Record<string, number>)[ind.id] || 0)
      const max = Math.max(...values)
      // Percentage indicators are usually < 200
      const isPercentage = ["margem_ebitda", "roe", "roa", "roic", "margem_liquida"].includes(ind.id)
      stats[ind.id] = { max, isPercentage }
    }
    return stats
  }, [data, selectedIndicators])

  // Separate indicators by whether they are percentages
  const valueIndicators = selectedIndicators.filter(
    (ind) => !indicatorStats[ind.id]?.isPercentage
  )
  const percentIndicators = selectedIndicators.filter(
    (ind) => indicatorStats[ind.id]?.isPercentage
  )

  // Max for value axis
  const maxValue = Math.max(
    ...valueIndicators.map((ind) => indicatorStats[ind.id]?.max || 0),
    1
  )
  // Max for percent axis
  const maxPercent = Math.max(
    ...percentIndicators.map((ind) => indicatorStats[ind.id]?.max || 0),
    1
  ) * 1.1

  const slot = innerW / data.length
  const barCount = valueIndicators.filter((ind) => ind.chartType === "bar").length
  const barW = barCount > 0 ? Math.min(slot * 0.6 / barCount, 40) : 30

  const toX = (i: number) => PAD.left + i * slot + slot / 2
  const toY = (v: number, isPercent: boolean) => {
    const maxVal = isPercent ? maxPercent : maxValue
    return PAD.top + innerH - (v / maxVal) * innerH
  }

  // Y-axis ticks
  const valueTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue]
  const percentTicks = [0, maxPercent * 0.5, maxPercent]

  const fmtValue = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}B`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}M`
    return `$${v.toFixed(0)}`
  }

  // Generate path for line/area charts
  const generatePath = (indicatorId: string, isPercent: boolean) => {
    return data
      .map((d, i) => {
        const value = (d as Record<string, number>)[indicatorId] || 0
        const x = toX(i)
        const y = toY(value, isPercent)
        return `${i === 0 ? "M" : "L"}${x},${y}`
      })
      .join(" ")
  }

  const generateAreaPath = (indicatorId: string, isPercent: boolean) => {
    const linePath = generatePath(indicatorId, isPercent)
    const lastX = toX(data.length - 1)
    const firstX = toX(0)
    const baseY = PAD.top + innerH
    return `${linePath} L${lastX},${baseY} L${firstX},${baseY} Z`
  }

  // Get color for indicator
  const getColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Grid lines */}
        {valueTicks.map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={toY(tick, false)}
            y2={toY(tick, false)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeOpacity="0.4"
            strokeDasharray={tick === 0 ? "0" : "4,4"}
          />
        ))}

        {/* Y-axis labels (left - values) */}
        {valueIndicators.length > 0 && valueTicks.map((tick) => (
          <text
            key={tick}
            x={PAD.left - 8}
            y={toY(tick, false)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--muted-foreground)"
            fontFamily="monospace"
          >
            {fmtValue(tick)}
          </text>
        ))}

        {/* Y-axis labels (right - percentages) */}
        {percentIndicators.length > 0 && percentTicks.map((tick) => (
          <text
            key={tick}
            x={W - PAD.right + 8}
            y={toY(tick, true)}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--muted-foreground)"
            fontFamily="monospace"
          >
            {tick.toFixed(0)}%
          </text>
        ))}

        {/* Render each indicator based on its chart type */}
        {selectedIndicators.map((ind, indIndex) => {
          const color = getColor(indIndex)
          const isPercent = indicatorStats[ind.id]?.isPercentage || false

          if (ind.chartType === "area") {
            return (
              <g key={ind.id}>
                <path
                  d={generateAreaPath(ind.id, isPercent)}
                  fill={color}
                  fillOpacity={0.15}
                />
                <path
                  d={generatePath(ind.id, isPercent)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.map((d, i) => {
                  const value = (d as Record<string, number>)[ind.id] || 0
                  return (
                    <circle
                      key={d.year}
                      cx={toX(i)}
                      cy={toY(value, isPercent)}
                      r={hovered === i ? 5 : 3}
                      fill={color}
                      stroke="var(--background)"
                      strokeWidth="2"
                      style={{ transition: "r 120ms" }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  )
                })}
              </g>
            )
          }

          if (ind.chartType === "line") {
            return (
              <g key={ind.id}>
                <path
                  d={generatePath(ind.id, isPercent)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {data.map((d, i) => {
                  const value = (d as Record<string, number>)[ind.id] || 0
                  return (
                    <circle
                      key={d.year}
                      cx={toX(i)}
                      cy={toY(value, isPercent)}
                      r={hovered === i ? 6 : 4}
                      fill={color}
                      stroke="var(--background)"
                      strokeWidth="2"
                      style={{ transition: "r 120ms" }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  )
                })}
              </g>
            )
          }

          // Bar chart
          const barIndicators = valueIndicators.filter((i) => i.chartType === "bar")
          const barIndex = barIndicators.findIndex((i) => i.id === ind.id)
          if (barIndex === -1) return null

          const totalBarWidth = barW * barCount + (barCount - 1) * 4
          const startOffset = -totalBarWidth / 2

          return (
            <g key={ind.id}>
              {data.map((d, i) => {
                const value = (d as Record<string, number>)[ind.id] || 0
                const x = toX(i) + startOffset + barIndex * (barW + 4)
                const y = toY(value, false)
                const height = PAD.top + innerH - y

                return (
                  <rect
                    key={d.year}
                    x={x}
                    y={y}
                    width={barW}
                    height={height}
                    rx={4}
                    fill={hovered === i ? color : `color-mix(in oklch, ${color} 75%, transparent)`}
                    style={{ transition: "fill 120ms" }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={d.year}
            x={toX(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {d.year}
          </text>
        ))}

        {/* Hover tooltip */}
        {hovered !== null && data[hovered] && (
          <g>
            <rect
              x={toX(hovered) - 70}
              y={8}
              width={140}
              height={20 + selectedIndicators.length * 16}
              rx={6}
              fill="var(--popover)"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={toX(hovered)}
              y={24}
              textAnchor="middle"
              fontSize={11}
              fontWeight="600"
              fill="var(--foreground)"
            >
              {data[hovered].year}
            </text>
            {selectedIndicators.map((ind, idx) => {
              const value = (data[hovered] as Record<string, number>)[ind.id] || 0
              const isPercent = indicatorStats[ind.id]?.isPercentage
              const label = INDICATOR_LABELS[ind.id] || ind.id
              const formattedValue = isPercent ? `${value.toFixed(1)}%` : fmtValue(value)
              
              return (
                <text
                  key={ind.id}
                  x={toX(hovered)}
                  y={40 + idx * 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--muted-foreground)"
                  fontFamily="monospace"
                >
                  {label}: {formattedValue}
                </text>
              )
            })}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        {selectedIndicators.map((ind, idx) => {
          const color = getColor(idx)
          const label = INDICATOR_LABELS[ind.id] || ind.id
          const ChartIcon = ind.chartType === "bar" ? BarChart3 : ind.chartType === "line" ? LineChart : AreaChart
          
          return (
            <div key={ind.id} className="flex items-center gap-1.5">
              <div
                className="size-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{label}</span>
              <ChartIcon className="size-3 text-muted-foreground/60" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// News item component
function NewsItem({
  type,
  title,
  time,
  category,
  onDismiss,
}: {
  type: string
  title: string
  time: string
  category?: string
  onDismiss?: () => void
}) {
  const icons = {
    news: <ExternalLink className="size-4" />,
    alert: <AlertTriangle className="size-4" />,
    review: <MessageSquare className="size-4" />,
  }
  const colors = {
    news: "bg-chart-1/10 text-chart-1",
    alert: "bg-destructive/10 text-destructive",
    review: "bg-chart-3/10 text-chart-3",
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          colors[type as keyof typeof colors]
        )}
      >
        {icons[type as keyof typeof icons]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight text-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {time}
          {category && <span> &bull; {category}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export default function DemoAnalysisPage() {
  const [selectedIndicators, setSelectedIndicators] = React.useState<SelectedIndicator[]>([
    { id: "receita_liquida", chartType: "bar" },
    { id: "margem_ebitda", chartType: "line" },
  ])
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2020, 0, 1),
    to: new Date(),
  })
  const [news, setNews] = React.useState(NEWS_DATA)

  const dismissNews = (id: number) => {
    setNews((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <span className="font-heading text-lg font-semibold">Dashboard</span>
          <div className="hidden max-w-md flex-1 sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar empresas, indicadores..."
                className="h-9 pl-9 pr-4"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm">
              <Bell className="size-4" />
            </Button>
            <div className="size-8 rounded-full bg-muted" />
          </div>
        </div>
      </header>

      <PageShell density="default">
        {/* Company Header */}
        <SurfaceCard
          tone="hero"
          padding="lg"
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
              <span className="font-heading text-lg font-bold">A</span>
            </div>
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                {COMPANY_DATA.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ticker: <span className="font-mono">{COMPANY_DATA.ticker}</span>{" "}
                &bull; {COMPANY_DATA.sector} &bull; CNPJ: {COMPANY_DATA.cnpj}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {COMPANY_DATA.tags.map((tag) => (
              <InfoChip key={tag} tone="muted">
                {tag}
              </InfoChip>
            ))}
            <Button variant="outline" size="sm" className="ml-2">
              Ver Perfil
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </SurfaceCard>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column - Analysis */}
          <div className="space-y-6 lg:col-span-8">
            {/* Indicator Analysis Card */}
            <SurfaceCard tone="default" padding="lg">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">
                  Analise de Indicadores
                </h2>
              </div>

              {/* Controls Row */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <IndicatorSelector
                  selected={selectedIndicators}
                  onSelectionChange={setSelectedIndicators}
                  maxSelections={5}
                />
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  minDate={new Date(2010, 0, 1)}
                  maxDate={new Date()}
                />
              </div>

              {/* Selected indicators summary */}
              {selectedIndicators.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {selectedIndicators.map((ind, idx) => {
                    const label = INDICATOR_LABELS[ind.id] || ind.id
                    const ChartIcon = ind.chartType === "bar" ? BarChart3 : ind.chartType === "line" ? LineChart : AreaChart
                    const color = CHART_COLORS[idx % CHART_COLORS.length]
                    
                    return (
                      <div
                        key={ind.id}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs"
                      >
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium">{label}</span>
                        <ChartIcon className="size-3 text-muted-foreground" />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Chart */}
              {selectedIndicators.length > 0 ? (
                <IndicatorChart
                  data={FINANCIAL_DATA}
                  selectedIndicators={selectedIndicators}
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    Selecione indicadores para visualizar o grafico
                  </p>
                </div>
              )}
            </SurfaceCard>

            {/* Data Table Card */}
            <SurfaceCard tone="default" padding="lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">
                  Dados Detalhados
                </h2>
                <Button variant="outline" size="sm">
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>

              <div className="mb-4">
                <div className="relative max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar indicadores..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>EBITDA</TableHead>
                    <TableHead>Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TABLE_DATA.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="font-mono font-medium">
                        {row.year}
                      </TableCell>
                      <TableCell className="font-mono">{row.receita}</TableCell>
                      <TableCell className="font-mono">{row.ebitda}</TableCell>
                      <TableCell className="font-mono">{row.margem}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SurfaceCard>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            {/* Stock Price Card */}
            <SurfaceCard tone="default" padding="lg">
              <div className="mb-1 flex items-center justify-between">
                <span className="eyebrow">Cotacao</span>
                <Button variant="ghost" size="icon-xs">
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-3xl font-semibold tabular-nums">
                  ${STOCK_DATA.price.toFixed(2)}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-0.5",
                    STOCK_DATA.change >= 0
                      ? "bg-chart-1/10 text-chart-1"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {STOCK_DATA.change >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {STOCK_DATA.change >= 0 ? "+" : ""}
                  {STOCK_DATA.change}%
                </Badge>
              </div>
              <div className="mt-3">
                <MiniSparkline data={STOCK_DATA.history} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {["Max", "10A", "5A", "3A", "1A"].map((period) => (
                  <Button
                    key={period}
                    variant={period === "1A" ? "secondary" : "ghost"}
                    size="xs"
                    className="h-6 px-2 text-xs"
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </SurfaceCard>

            {/* News Card */}
            <SurfaceCard tone="default" padding="lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold">
                  Noticias Recentes
                </h2>
                <Select defaultValue="today">
                  <SelectTrigger className="h-7 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="-mx-2 space-y-1">
                {news.map((item) => (
                  <NewsItem
                    key={item.id}
                    type={item.type}
                    title={item.title}
                    time={item.time}
                    category={item.category}
                    onDismiss={() => dismissNews(item.id)}
                  />
                ))}
              </div>

              {news.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma noticia recente
                </div>
              )}

              {news.length > 0 && (
                <Button
                  variant="ghost"
                  className="mt-3 w-full justify-center text-sm"
                >
                  Ver Todas
                  <ArrowUpRight className="size-3.5" />
                </Button>
              )}
            </SurfaceCard>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <SurfaceCard tone="subtle" padding="md">
                <span className="eyebrow">Total Sales</span>
                <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                  $82,450
                </p>
                <p className="mt-0.5 text-xs text-chart-1">+20% vs Last Month</p>
              </SurfaceCard>
              <SurfaceCard tone="subtle" padding="md">
                <span className="eyebrow">Orders</span>
                <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                  3,670
                </p>
                <p className="mt-0.5 text-xs text-destructive">
                  -4.2% vs Last Month
                </p>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  )
}
