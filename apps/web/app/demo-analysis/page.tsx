"use client"

import * as React from "react"
import { format } from "date-fns"
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
import { IndicatorSelector } from "@/components/analysis/indicator-selector"
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
  { year: 2020, receita: 274500, ebitda: 77300, margem: 28.2 },
  { year: 2021, receita: 365800, ebitda: 120200, margem: 32.9 },
  { year: 2022, receita: 394300, ebitda: 130900, margem: 33.2 },
  { year: 2023, receita: 383300, ebitda: 125800, margem: 32.8 },
  { year: 2024, receita: 410500, ebitda: 138200, margem: 33.7 },
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
    time: "Há 2 horas",
    category: "Tech",
  },
  {
    id: 2,
    type: "alert",
    title: "Alerta: Resultados do trimestre",
    time: "Há 3 horas",
  },
  {
    id: 3,
    type: "review",
    title: "Revisão positiva de analistas Goldman",
    time: "Há 5 horas",
  },
]

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

// Bar + Line Chart component
function IndicatorChart({
  data,
  selectedIndicators,
}: {
  data: typeof FINANCIAL_DATA
  selectedIndicators: string[]
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  const showReceita = selectedIndicators.includes("receita_liquida")
  const showEbitda = selectedIndicators.includes("ebitda")
  const showMargem = selectedIndicators.includes("margem_ebitda")

  const W = 700
  const H = 220
  const PAD = { top: 24, right: 50, bottom: 32, left: 60 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  // Calculate scales
  const maxValue = Math.max(
    ...data.map((d) =>
      Math.max(showReceita ? d.receita : 0, showEbitda ? d.ebitda : 0)
    )
  )
  const maxMargem = Math.max(...data.map((d) => d.margem)) + 5

  const slot = innerW / data.length
  const barW = showReceita && showEbitda ? slot * 0.35 : slot * 0.5

  const toX = (i: number) => PAD.left + i * slot + slot / 2
  const toY = (v: number) => PAD.top + innerH - (v / maxValue) * innerH
  const toYMargem = (v: number) =>
    PAD.top + innerH - (v / maxMargem) * innerH

  // Line points for margem
  const margemPoints = data
    .map((d, i) => `${toX(i)},${toYMargem(d.margem)}`)
    .join(" ")

  // Y-axis ticks
  const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue]
  const yMargemTicks = [0, maxMargem * 0.5, maxMargem]

  const fmtValue = (v: number) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}B`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}M`
    return `$${v}`
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={toY(tick)}
            y2={toY(tick)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeOpacity="0.4"
            strokeDasharray={tick === 0 ? "0" : "4,4"}
          />
        ))}

        {/* Y-axis labels (left - values) */}
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={PAD.left - 8}
            y={toY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--muted-foreground)"
            fontFamily="monospace"
          >
            {fmtValue(tick)}
          </text>
        ))}

        {/* Y-axis labels (right - margem %) */}
        {showMargem &&
          yMargemTicks.map((tick) => (
            <text
              key={tick}
              x={W - PAD.right + 8}
              y={toYMargem(tick)}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
              fontFamily="monospace"
            >
              {tick.toFixed(0)}%
            </text>
          ))}

        {/* Bars */}
        {data.map((d, i) => {
          const x = toX(i)
          const isHovered = hovered === i

          return (
            <g key={d.year}>
              {/* Receita bar */}
              {showReceita && (
                <rect
                  x={showEbitda ? x - barW - 2 : x - barW / 2}
                  y={toY(d.receita)}
                  width={barW}
                  height={innerH - (toY(d.receita) - PAD.top)}
                  rx={4}
                  fill={
                    isHovered
                      ? "var(--chart-1)"
                      : "color-mix(in oklch, var(--chart-1) 70%, transparent)"
                  }
                  style={{ transition: "fill 120ms" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              )}

              {/* EBITDA bar */}
              {showEbitda && (
                <rect
                  x={showReceita ? x + 2 : x - barW / 2}
                  y={toY(d.ebitda)}
                  width={barW}
                  height={innerH - (toY(d.ebitda) - PAD.top)}
                  rx={4}
                  fill={
                    isHovered
                      ? "var(--chart-3)"
                      : "color-mix(in oklch, var(--chart-3) 70%, transparent)"
                  }
                  style={{ transition: "fill 120ms" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              )}

              {/* X-axis label */}
              <text
                x={x}
                y={H - 10}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {d.year}
              </text>
            </g>
          )
        })}

        {/* Margem line */}
        {showMargem && (
          <>
            <polyline
              points={margemPoints}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((d, i) => (
              <circle
                key={d.year}
                cx={toX(i)}
                cy={toYMargem(d.margem)}
                r={hovered === i ? 5 : 4}
                fill="var(--chart-2)"
                stroke="var(--background)"
                strokeWidth="2"
                style={{ transition: "r 120ms" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </>
        )}

        {/* Hover tooltip */}
        {hovered !== null && data[hovered] && (
          <g>
            <rect
              x={toX(hovered) - 55}
              y={PAD.top - 20}
              width={110}
              height={50}
              rx={6}
              fill="var(--popover)"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={toX(hovered)}
              y={PAD.top - 5}
              textAnchor="middle"
              fontSize={10}
              fontWeight="600"
              fill="var(--foreground)"
            >
              {data[hovered].year}
            </text>
            <text
              x={toX(hovered)}
              y={PAD.top + 10}
              textAnchor="middle"
              fontSize={9}
              fill="var(--muted-foreground)"
              fontFamily="monospace"
            >
              Receita: {fmtValue(data[hovered].receita)}
            </text>
            <text
              x={toX(hovered)}
              y={PAD.top + 22}
              textAnchor="middle"
              fontSize={9}
              fill="var(--muted-foreground)"
              fontFamily="monospace"
            >
              Margem: {data[hovered].margem}%
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
        {showReceita && (
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-sm bg-chart-1" />
            <span className="text-muted-foreground">Receita Líquida</span>
          </div>
        )}
        {showEbitda && (
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-sm bg-chart-3" />
            <span className="text-muted-foreground">EBITDA</span>
          </div>
        )}
        {showMargem && (
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Margem EBITDA</span>
          </div>
        )}
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
  const [selectedIndicators, setSelectedIndicators] = React.useState<string[]>([
    "receita_liquida",
    "margem_ebitda",
  ])
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2020, 0, 1),
    to: new Date(),
  })
  const [chartType, setChartType] = React.useState("barras")
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
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barras">Barras</SelectItem>
                    <SelectItem value="linha">Linha</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chart */}
              <IndicatorChart
                data={FINANCIAL_DATA}
                selectedIndicators={selectedIndicators}
              />
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
