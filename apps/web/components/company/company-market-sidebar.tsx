import Link from "next/link";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  FileTextIcon,
  NewspaperIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { SurfaceCard } from "@/components/shared/design-system-recipes";
import type { CompanyInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

type CompanyMarketSidebarProps = {
  company: CompanyInfo;
};

type QuoteModel = {
  price: number;
  changePercent: number;
  points: number[];
};

type NewsItem = {
  id: string;
  title: string;
  timeLabel: string;
  source: string;
  tone: "brand" | "warning" | "info";
};

const PERIODS = ["Max", "10A", "5A", "3A", "1A"] as const;

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getSeed(company: CompanyInfo): number {
  const seedSource = `${company.cd_cvm}:${company.ticker_b3 ?? company.company_name}`;

  return Array.from(seedSource).reduce(
    (seed, character) => seed + character.charCodeAt(0),
    0,
  );
}

function buildQuoteModel(company: CompanyInfo): QuoteModel {
  const seed = getSeed(company);
  const price = 24 + (seed % 180) + ((seed * 17) % 100) / 100;
  const changePercent = ((seed % 56) - 18) / 10;
  const base = 42 + (seed % 12);
  const points = Array.from({ length: 9 }, (_, index) => {
    const wave = Math.sin((seed + index * 19) / 13) * 12;
    const drift = index * (changePercent >= 0 ? 3.1 : -1.5);
    return Math.max(12, Math.min(94, base + wave + drift));
  });

  return {
    price,
    changePercent,
    points,
  };
}

function buildNewsItems(company: CompanyInfo): NewsItem[] {
  const ticker = company.ticker_b3 ?? "Companhia";
  const sector = company.sector_name || "setor";

  return [
    {
      id: "results",
      title: `${ticker} atualiza leitura de resultados`,
      timeLabel: "Ha 2 horas",
      source: "Mercado",
      tone: "brand",
    },
    {
      id: "sector",
      title: `Analistas acompanham pares de ${sector}`,
      timeLabel: "Ha 3 horas",
      source: "Setor",
      tone: "warning",
    },
    {
      id: "filing",
      title: "Nova demonstracao entra no radar",
      timeLabel: "Ha 5 horas",
      source: "CVM",
      tone: "info",
    },
  ];
}

function buildSparklinePath(points: number[]): string {
  if (points.length === 0) {
    return "";
  }

  const width = 224;
  const height = 76;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1 || 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function QuoteSparkline({ points }: { points: number[] }) {
  const path = buildSparklinePath(points);

  return (
    <svg
      viewBox="0 0 224 86"
      className="h-24 w-full overflow-visible text-primary"
      role="img"
      aria-label="Movimento recente da cotacao"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />
      <path d={`${path} L 224 86 L 0 86 Z`} fill="currentColor" opacity="0.07" />
    </svg>
  );
}

function NewsIcon({ tone }: { tone: NewsItem["tone"] }) {
  const className = cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
    tone === "brand" &&
      "border-primary/20 bg-primary/10 text-primary dark:text-primary",
    tone === "warning" &&
      "border-amber-500/20 bg-amber-500/10 text-amber-500",
    tone === "info" && "border-sky-500/20 bg-sky-500/10 text-sky-400",
  );

  if (tone === "warning") {
    return (
      <span className={className}>
        <TriangleAlertIcon className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (tone === "info") {
    return (
      <span className={className}>
        <FileTextIcon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span className={className}>
      <ArrowUpRightIcon className="h-3.5 w-3.5" />
    </span>
  );
}

function CompanyQuoteCard({ company }: CompanyMarketSidebarProps) {
  const quote = buildQuoteModel(company);
  const isPositive = quote.changePercent >= 0;

  return (
    <SurfaceCard
      tone="subtle"
      padding="md"
      className="group relative overflow-hidden px-6 py-6"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            COTACAO
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="font-heading text-4xl font-semibold tracking-[-0.055em] text-foreground">
              {BRL_FORMATTER.format(quote.price)}
            </p>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                isPositive
                  ? "bg-primary/12 text-primary"
                  : "bg-destructive/12 text-destructive",
              )}
            >
              {isPositive ? "+" : ""}
              {quote.changePercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <Link
          href={`/empresas/${company.cd_cvm}?aba=visao-geral`}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir detalhes da cotacao"
        >
          <ArrowUpRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5">
        <QuoteSparkline points={quote.points} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {PERIODS.map((period) => {
          const isSelected = period === "1A";

          return (
            <span
              key={period}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                isSelected
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground/80",
              )}
            >
              {period}
            </span>
          );
        })}
      </div>
    </SurfaceCard>
  );
}

function CompanyNewsCard({ company }: CompanyMarketSidebarProps) {
  const newsItems = buildNewsItems(company);

  return (
    <SurfaceCard tone="subtle" padding="md" className="px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <NewspaperIcon className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-lg font-semibold tracking-[-0.025em] text-foreground">
            Noticias Recentes
          </h3>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 text-xs font-medium text-foreground/85 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          today
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {newsItems.map((item) => (
          <article key={item.id} className="flex gap-3">
            <NewsIcon tone={item.tone} />
            <div className="min-w-0 space-y-1">
              <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                {item.title}
              </h4>
              <p className="text-xs leading-4 text-muted-foreground">
                {item.timeLabel} Â· {item.source}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          href={`/empresas/${company.cd_cvm}?aba=visao-geral`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver Todas
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SurfaceCard>
  );
}

export function CompanyMarketSidebar({ company }: CompanyMarketSidebarProps) {
  return (
    <aside className="flex flex-col gap-5" aria-label="Resumo de mercado">
      <CompanyQuoteCard company={company} />
      <CompanyNewsCard company={company} />
    </aside>
  );
}
