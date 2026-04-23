import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-primary/20 px-8 py-14 sm:px-12 sm:py-16 lg:px-16"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--primary) 12%, var(--background)), color-mix(in oklch, var(--primary) 4%, var(--background)))",
        }}
      >
        {/* Background Pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          <p className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-primary">
            Pronto para comecar?
          </p>

          <h2 className="max-w-2xl font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.04em] text-foreground leading-tight">
            Compare ate 4 empresas.{" "}
            <span className="text-muted-foreground">Veja onde divergem.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-[1rem] leading-relaxed text-muted-foreground">
            KPIs lado a lado, diferencas em destaque, periodos sincronizados.
            A melhor forma de entender o posicionamento competitivo.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/comparar"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full px-8 gap-2"
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
              Ver todas as empresas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
