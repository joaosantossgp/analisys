"use client";

import { startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { mergeSearchParams } from "@/lib/search-params";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

type DirectoryPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  currentSearch: string;
  currentSector: string | null;
};

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function DirectoryPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  hasNext,
  hasPrevious,
  currentSearch,
  currentSector,
}: DirectoryPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  function goTo(page: number) {
    const query = mergeSearchParams(searchParams.toString(), {
      busca: currentSearch || null,
      setor: currentSector,
      pagina: page === 1 ? null : page,
    });

    track("companies_pagination_clicked", {
      page,
      search: currentSearch,
      sector: currentSector,
    });

    startTransition(() => {
      router.push(query ? `/empresas?${query}` : "/empresas");
    });
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const pillBase =
    "flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm transition-colors";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando {rangeStart}–{rangeEnd} de {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => hasPrevious && goTo(currentPage - 1)}
          className={cn(
            pillBase,
            "border border-border/60",
            hasPrevious
              ? "hover:border-border hover:text-foreground text-muted-foreground"
              : "pointer-events-none opacity-35",
          )}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="size-4" />
        </button>

        {visiblePages.map((page, index) => {
          const prev = visiblePages[index - 1];
          const showEllipsis = prev !== undefined && page - prev > 1;

          return (
            <span key={page} className="flex items-center gap-1">
              {showEllipsis ? (
                <span className={cn(pillBase, "text-muted-foreground")}>…</span>
              ) : null}
              <button
                type="button"
                onClick={() => goTo(page)}
                className={cn(
                  pillBase,
                  "border",
                  page === currentPage
                    ? "border-primary bg-primary text-primary-foreground font-medium"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {page}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => hasNext && goTo(currentPage + 1)}
          className={cn(
            pillBase,
            "border border-border/60",
            hasNext
              ? "hover:border-border hover:text-foreground text-muted-foreground"
              : "pointer-events-none opacity-35",
          )}
          aria-label="Próxima página"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
