import Link from "next/link";
import { ArrowRightIcon, GitCompareArrowsIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
    <section className="w-full max-w-5xl mx-auto">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-border/60",
          "bg-gradient-to-br from-card via-card to-primary/5",
          "px-8 py-12 sm:px-12 sm:py-14"
        )}
      >
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-48 rounded-full bg-chart-2/8 blur-3xl" />

        <div className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="max-w-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5">
              <GitCompareArrowsIcon className="size-4 text-primary" />
              <span className="text-[0.75rem] font-medium text-primary">Comparacao avancada</span>
            </div>
            <h2 className="font-heading text-[clamp(1.5rem,4vw,2rem)] font-medium tracking-[-0.03em] text-foreground">
              Compare ate 4 empresas lado a lado
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
              KPIs sincronizados, diferencas em destaque, periodos alinhados. 
              Veja onde as empresas divergem em segundos.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/comparar"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full px-6 gap-2"
              )}
            >
              Comparar empresas
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href="/empresas"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full px-6"
              )}
            >
              Ver diretorio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
