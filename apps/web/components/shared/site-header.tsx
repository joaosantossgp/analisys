"use client";

import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import ThemeToggle from "@/components/toggle-theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { label: "Home", href: "/" },
  { label: "Empresas", href: "/empresas" },
  { label: "Comparar", href: "/comparar" },
  { label: "Setores", href: "/setores" },
  { label: "KPIs", href: null },
  { label: "Macro", href: null },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuState, setMobileMenuState] = useState<{
    open: boolean;
    pathname: string;
  }>({
    open: false,
    pathname,
  });
  const mobileOpen =
    mobileMenuState.open && mobileMenuState.pathname === pathname;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-medium tracking-[0.22em] text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground text-xs font-semibold tracking-[0.18em] text-background">
            CVM
          </span>
          <span className="hidden font-heading text-sm uppercase text-foreground/80 sm:inline">
            Analytics
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-full px-4 text-[0.84rem] text-foreground/78 hover:text-foreground",
                  pathname === item.href && "bg-muted text-foreground",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.84rem] text-muted-foreground/78"
              >
                {item.label}
                <span className="h-1.5 w-1.5 rounded-full bg-border/90" />
                <span className="text-[0.64rem] font-medium uppercase tracking-[0.2em] text-muted-foreground/62">
                  Em breve
                </span>
              </span>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="rounded-full border border-border/65 bg-background/78 px-2 py-1 shadow-sm shadow-black/5" />
          <span className="hidden text-xs uppercase tracking-[0.26em] text-muted-foreground lg:inline">
            Slice publico V2
          </span>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border/65 bg-background/78 text-foreground shadow-sm shadow-black/5 md:hidden"
            onClick={() =>
              setMobileMenuState((current) =>
                current.open && current.pathname === pathname
                  ? { open: false, pathname }
                  : { open: true, pathname },
              )
            }
            aria-expanded={mobileOpen}
            aria-controls="mobile-site-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-site-nav"
          className="border-t border-border/60 bg-background/96 px-4 py-4 shadow-[0_20px_40px_-28px_rgba(16,30,24,0.28)] md:hidden"
        >
          <nav className="flex flex-col gap-2">
            {PRIMARY_NAV.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-start rounded-2xl px-4 py-3 text-[0.95rem] text-foreground/80",
                    pathname === item.href && "bg-muted text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-[0.95rem] text-muted-foreground"
                >
                  <span>{item.label}</span>
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.2em]">
                    Em breve
                  </span>
                </div>
              ),
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
