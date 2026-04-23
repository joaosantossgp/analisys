import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Busque a empresa",
    description:
      "Digite nome, ticker ou codigo CVM. A busca sugere resultados em tempo real.",
  },
  {
    step: "02",
    title: "Explore os dados",
    description:
      "Navegue por DRE, Balanco e DFC. Veja KPIs calculados automaticamente.",
  },
  {
    step: "03",
    title: "Compare e decida",
    description:
      "Coloque empresas lado a lado. Identifique diferencas e padroes.",
  },
] as const;

const BENEFITS = [
  "Dados oficiais da CVM",
  "Historico desde 2010",
  "KPIs padronizados",
  "Atualizacao continua",
  "Interface limpa",
  "Acesso gratuito",
] as const;

export function WorkflowSection() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        {/* Left: Workflow Steps */}
        <div className="space-y-8">
          <div>
            <p className="mb-2 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-muted-foreground">
              Como funciona
            </p>
            <h2 className="font-heading text-[1.875rem] font-medium tracking-[-0.04em] text-foreground">
              Tres passos para{" "}
              <span className="text-muted-foreground">insights.</span>
            </h2>
          </div>

          <div className="space-y-6">
            {WORKFLOW_STEPS.map((item, index) => (
              <div key={item.step} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {item.step}
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className="absolute top-10 h-[calc(100%+0.5rem)] w-px bg-gradient-to-b from-primary/30 to-transparent" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <h3 className="font-heading text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Benefits Card */}
        <div className="flex flex-col justify-center">
          <div
            className="rounded-[1.75rem] border border-border/60 p-8 sm:p-10"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklch, var(--primary) 6%, var(--card)), var(--card))",
            }}
          >
            <p className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-muted-foreground">
              Por que usar
            </p>
            <h3 className="font-heading text-[1.5rem] font-medium tracking-[-0.035em] text-foreground leading-tight">
              Dados que voce pode confiar.
            </h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
              Nossa plataforma processa e padroniza dados diretamente da CVM,
              garantindo precisao e consistencia em todas as analises.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                  <span className="text-[0.85rem] text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/empresas"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full px-6 gap-2"
                )}
              >
                Comecar agora
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
