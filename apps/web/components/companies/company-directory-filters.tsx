"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  const hasCurrentSector = sectors.some(
    (sector) => sector.sector_slug === currentSector,
  );
  const selectValue =
    sectorFilterUnavailable || !hasCurrentSector
      ? "all"
      : currentSector ?? "all";

  const hasActiveFilters = Boolean(currentSearch || currentSector);

  function pushFilters(
    updates: Record<string, string | number | null | undefined>,
  ) {
    const query = mergeSearchParams(searchParams.toString(), updates);
    const href = query ? `/empresas?${query}` : "/empresas";

    startTransition(() => {
      router.push(href);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    track("companies_filter_changed", {
      search,
      sector: currentSector,
      source: "search",
    });

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="eyebrow text-muted-foreground">Filtros</p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Busca</label>
        <div className="flex items-center gap-2 rounded-[1rem] border border-border/65 bg-muted/55 px-3 py-2.5">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, ticker ou CVM"
            className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Setor</label>
        <Select
          value={selectValue}
          disabled={sectorFilterUnavailable}
          onValueChange={(value) => {
            const nextSector = value === "all" ? null : value;
            track("companies_filter_changed", {
              search,
              sector: nextSector,
              source: "sector",
            });
            pushFilters({ setor: nextSector, pagina: null });
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-[1rem] bg-background px-3 text-sm">
            <SelectValue
              placeholder={
                sectorFilterUnavailable
                  ? "Filtro indisponível"
                  : "Todos os setores"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos os setores</SelectItem>
              {!sectorFilterUnavailable
                ? sectors.map((sector) => (
                    <SelectItem
                      key={sector.sector_slug}
                      value={sector.sector_slug}
                    >
                      {sector.sector_name} · {sector.company_count}
                    </SelectItem>
                  ))
                : null}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="sm" className="w-full rounded-full">
        Aplicar filtros
      </Button>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={handleClear}
          className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <XIcon className="size-3" />
          Limpar filtros
        </button>
      ) : null}
    </form>
  );
}
