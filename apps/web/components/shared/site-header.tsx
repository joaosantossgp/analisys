"use client";

import Link from "next/link";
import {
  BarChart3Icon,
  Building2Icon,
  ChevronDownIcon,
  DatabaseZapIcon,
  GitCompareArrowsIcon,
  LayersIcon,
  LineChartIcon,
  MenuIcon,
  TrendingUpIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
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
] as const;

const DROPDOWN_ITEMS = {
  analise: [
    {
      icon: BarChart3Icon,
      label: "KPIs",
      description: "60+ indicadores calculados",
      href: null,
      soon: true,
    },
    {
      icon: TrendingUpIcon,
      label: "Macro",
      description: "Indicadores macroeconomicos",
      href: null,
      soon: true,
    },
    {
      icon: LineChartIcon,
      label: "Screener",
      description: "Filtre empresas por criterios",
      href: null,
      soon: true,
    },
  ],
  recursos: [
    {
      icon: LayersIcon,
      label: "Metodologia",
      description: "Como os dados sao processados",
      href: null,
      soon: true,
    },
    {
      icon: Building2Icon,
      label: "Fontes",
      description: "Origem e rastreabilidade",
      href: null,
      soon: true,
    },
    {
      icon: GitCompareArrowsIcon,
      label: "Design System",
      description: "Componentes e padroes",
      href: "/design-system",
      soon: false,
    },
    {
      icon: UserIcon,
      label: "Portfolio",
      description: "Projetos e experiencia",
      href: "/portfolio",
      soon: false,
    },
    {
      icon: DatabaseZapIcon,
      label: "Atualizar base",
      description: "Operacao administrativa em lote",
      href: "/atualizar-base",
      soon: false,
    },
  ],
} as const;

type DropdownItem = {
  icon: typeof BarChart3Icon;
  label: string;
  description: string;
  href: string | null;
  soon: boolean;
};

type DropdownMenuProps = {
  label: string;
  items: readonly DropdownItem[];
};

function NavDropdown({ label, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "rounded-full px-4 text-sm text-foreground/78 hover:text-foreground gap-1"
        )}
        aria-expanded={open}
        aria-label={`Abrir menu ${label}`}
      >
        {label}
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[280px] -translate-x-1/2 pt-2">
          <div className="rounded-[1rem] border border-border/60 bg-card/98 p-2 shadow-[0_20px_50px_-20px_rgba(16,30,24,0.3)] backdrop-blur-xl">
            {items.map((item) => {
              const content = (
                <div className="flex items-start gap-3 rounded-[0.75rem] px-3 py-2.5 transition-colors hover:bg-accent/60">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                    <item.icon className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      {item.soon && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Em breve
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              );

              if (item.href) {
                return (
                  <Link key={item.label} href={item.href}>
                    {content}
                  </Link>
                );
              }

              return (
                <div key={item.label} className="cursor-default opacity-70">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

        <nav className="hidden items-center gap-0.5 md:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-full px-4 text-sm text-foreground/78 hover:text-foreground",
                pathname === item.href && "bg-muted text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <NavDropdown label="Analise" items={DROPDOWN_ITEMS.analise} />
          <NavDropdown label="Recursos" items={DROPDOWN_ITEMS.recursos} />
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
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-start rounded-2xl px-4 py-3 text-base text-foreground/80",
                  pathname === item.href && "bg-muted text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Dropdown Sections */}
            <div className="mt-2 border-t border-border/60 pt-4">
              <p className="mb-2 px-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Analise
              </p>
              {DROPDOWN_ITEMS.analise.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "w-full justify-start gap-3 rounded-2xl px-4 py-3 text-base text-foreground/80",
                    )}
                  >
                    <item.icon className="size-4 text-primary" />
                    {item.label}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-base text-muted-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.15em]">
                      Em breve
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="mt-2 border-t border-border/60 pt-4">
              <p className="mb-2 px-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Recursos
              </p>
              {DROPDOWN_ITEMS.recursos.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "w-full justify-start gap-3 rounded-2xl px-4 py-3 text-base text-foreground/80",
                    )}
                  >
                    <item.icon className="size-4 text-primary" />
                    {item.label}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-base text-muted-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.15em]">
                      Em breve
                    </span>
                  </div>
                ),
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
