"use client";

import { ArrowRightIcon, SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  buildApiUrlFromBase,
  type CompanySuggestionItem,
} from "@/lib/api";
import { getSectorColor, getSectorNameFromSlug } from "@/lib/constants";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

const QUICK_CHIPS = [
  "PETROBRAS",
  "VALE3",
  "ITAUB4",
  "BBDC4",
  "Financeiro",
  "PetrÃ³leo e GÃ¡s",
];

type CompanySearchHeroProps = {
  apiBaseUrl: string;
};

type SuggestionResponse = {
  items?: CompanySuggestionItem[];
};

export function CompanySearchHero({ apiBaseUrl }: CompanySearchHeroProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<CompanySuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const normalized = deferredQuery.trim();
    if (normalized.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = new URL(
          buildApiUrlFromBase(apiBaseUrl, "/companies/suggestions"),
        );
        url.searchParams.set("q", normalized);
        url.searchParams.set("limit", "6");

        const response = await fetch(url.toString());
        const payload = (await response.json()) as SuggestionResponse;

        if (!active) {
          return;
        }

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        setSuggestions(payload.items ?? []);
      } catch {
        if (active) {
          setSuggestions([]);
        }
      } finally {
        if (active) {
          setLoadingSuggestions(false);
        }
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [apiBaseUrl, deferredQuery]);

  const showDropdown = focused && (loadingSuggestions || suggestions.length > 0);

  function navigateToCompany(item: CompanySuggestionItem) {
    track("home_suggestion_selected", {
      cd_cvm: item.cd_cvm,
      company_name: item.company_name,
    });
    startTransition(() => router.push(`/empresas/${item.cd_cvm}`));
  }

  function submit() {
    const q = query.trim();
    track("home_search_submitted", { query: q });
    startTransition(() =>
      router.push(q ? `/empresas?busca=${encodeURIComponent(q)}` : "/empresas"),
    );
  }

  return (
    <div className="w-full max-w-[680px] mx-auto space-y-6 text-center">
      <div className="space-y-4">
        <h1 className="font-heading text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] tracking-[-0.045em] text-foreground">
          AnÃ¡lise financeira
          <br />
          <span className="text-muted-foreground italic font-normal">
            de quem estÃ¡ na bolsa.
          </span>
        </h1>
        <p className="max-w-[560px] mx-auto text-[1.0625rem] leading-[1.55] text-muted-foreground">
          Pesquise qualquer companhia aberta brasileira. Leia DRE, balanÃ§o e KPIs
          com 10+ anos de histÃ³rico, direto da CVM.
        </p>
      </div>

      <div className="relative text-left">
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "flex items-center gap-3 bg-card border transition-all duration-200 cursor-text px-5 py-2 pr-2",
            showDropdown ? "rounded-[1.25rem_1.25rem_0_0]" : "rounded-[1.25rem]",
            focused
              ? "border-ring/50 shadow-[0_0_0_4px_color-mix(in_oklch,var(--ring)_15%,transparent),0_20px_60px_-40px_rgba(16,30,24,0.25)]"
              : "border-border/70 shadow-[0_18px_50px_-40px_rgba(16,30,24,0.22)]",
          )}
        >
          <SearchIcon className="size-[1.375rem] shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Petrobras, VALE3, setor financeiroâ€¦"
            className="flex-1 border-none bg-transparent py-[0.85rem] text-[1.125rem] text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Buscar empresa"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground mr-1"
              aria-label="Limpar busca"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-5 shrink-0")}
          >
            Buscar
            <ArrowRightIcon className="size-4" />
          </button>
        </div>

        {showDropdown ? (
          <div className="absolute inset-x-0 top-full z-20 overflow-hidden rounded-[0_0_1.25rem_1.25rem] border border-t-0 border-ring/50 bg-card shadow-[0_20px_60px_-30px_rgba(16,30,24,0.25)]">
            <div className="border-t border-border bg-muted/30 px-5 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {loadingSuggestions
                ? "Buscandoâ€¦"
                : `${suggestions.length} resultado${suggestions.length !== 1 ? "s" : ""}`}
            </div>
            {suggestions.map((item) => {
              const sectorName = getSectorNameFromSlug(item.sector_slug);
              const color = getSectorColor(sectorName);
              const initials = (item.ticker_b3 ?? item.company_name).slice(0, 2).toUpperCase();
              return (
                <button
                  key={item.cd_cvm}
                  type="button"
                  onMouseDown={() => navigateToCompany(item)}
                  className="flex w-full items-center gap-4 border-t border-border/50 px-5 py-3.5 text-left transition-colors hover:bg-accent/60"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-[10px] font-heading text-sm font-semibold"
                    style={{
                      background: `color-mix(in oklch, ${color} 12%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
                      color,
                    }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{item.company_name}</span>
                      {item.ticker_b3 ? (
                        <span
                          className="font-mono text-[0.7rem] font-medium px-1.5 py-0.5 rounded-[0.35rem]"
                          style={{
                            background: `color-mix(in oklch, ${color} 12%, transparent)`,
                            border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
                            color,
                          }}
                        >
                          {item.ticker_b3}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground mt-0.5">
                      {sectorName ?? "Setor nao informado"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[0.72rem] uppercase tracking-[0.15em] text-muted-foreground">
                      CVM
                    </p>
                    <p className="mt-0.5 font-mono text-[0.78rem] font-medium text-foreground tabular-nums">
                      {item.cd_cvm}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center items-center gap-2">
        <span className="text-[0.8rem] text-muted-foreground">Tente:</span>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setQuery(chip);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[0.75rem] text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
