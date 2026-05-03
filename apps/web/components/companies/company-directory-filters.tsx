"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanySectorFilter } from "@/lib/api";
import { mergeSearchParams } from "@/lib/search-params";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

type CompanyDirectoryFiltersProps = {
  currentSearch: string;
  currentSector: string | null;
  sectors: CompanySectorFilter[];
  sectorFilterUnavailable?: boolean;
};

export function CompanyDirectoryFilters({
  currentSearch,
  currentSector,
  sectors,
  sectorFilterUnavailable = false,
}: CompanyDirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);

  const hasCurrentSector = sectors.some((s) => s.sector_slug === currentSector);
  const selectValue =
    sectorFilterUnavailable || !hasCurrentSector ? "all" : currentSector ?? "all";

  const hasActiveFilters = Boolean(currentSearch || currentSector);

  function pushFilters(updates: Record<string, string | number | null | undefined>) {
    const query = mergeSearchParams(searchParams.toString(), updates);
    const href = query ? `/empresas?${query}` : "/empresas";
    startTransition(() => router.push(href));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    track("companies_filter_changed", { search, sector: currentSector, source: "search" });
    pushFilters({
      busca: search.trim() || null,
      setor:
        sectorFilterUnavailable || (currentSector !== null && !hasCurrentSector)
          ? null
          : undefined,
      pagina: null,
    });
  }

  function handleClear() {
    setSearch("");
    pushFilters({ busca: null, setor: null, pagina: null });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-[1rem] border border-border/65 bg-muted/55 px-3 py-2">
            <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, ticker ou CVM"
              className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  pushFilters({ busca: null, pagina: null });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          <Select
            value={selectValue}
            disabled={sectorFilterUnavailable}
            onValueChange={(value) => {
              const nextSector = value === "all" ? null : value;
              track("companies_filter_changed", { search, sector: nextSector, source: "sector" });
              pushFilters({ setor: nextSector, pagina: null });
            }}
          >
            <SelectTrigger
              className={cn(
                "h-[2.375rem] w-auto min-w-[160px] rounded-[1rem] border-border/65 bg-muted/55 px-3 text-sm",
              )}
            >
              <SelectValue
                placeholder={sectorFilterUnavailable ? "IndisponÃ­vel" : "Todos os setores"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos os setores</SelectItem>
                {!sectorFilterUnavailable
                  ? sectors.map((sector) => (
                      <SelectItem key={sector.sector_slug} value={sector.sector_slug}>
                        {sector.sector_name} Â· {sector.company_count}
                      </SelectItem>
                    ))
                  : null}
              </SelectGroup>
            </SelectContent>
          </Select>

          <button type="submit" className="sr-only">
            Buscar
          </button>
        </div>
      </form>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {currentSearch && (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              &ldquo;{currentSearch}&rdquo;
              <button
                type="button"
                onClick={() => pushFilters({ busca: null, pagina: null })}
                className="hover:opacity-70"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          )}
          {currentSector && hasCurrentSector && (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              {sectors.find((s) => s.sector_slug === currentSector)?.sector_name ??
                currentSector}
              <button
                type="button"
                onClick={() => pushFilters({ setor: null, pagina: null })}
                className="hover:opacity-70"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  );
}
