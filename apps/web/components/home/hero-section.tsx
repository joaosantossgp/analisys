"use client";

import { ArrowRightIcon, PlayCircleIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-4xl text-center">
      <div className="space-y-6">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[0.75rem] font-medium text-primary">
            Plataforma Publica V2
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="font-heading text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.045em] text-foreground">
          Analise financeira
          <br />
          <span className="text-muted-foreground italic font-normal">
            de quem esta na bolsa.
          </span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto max-w-[600px] text-[1.125rem] leading-[1.6] text-muted-foreground">
          Acesse demonstracoes financeiras, KPIs calculados e historico de 10+ anos
          de todas as companhias abertas brasileiras. Dados oficiais da CVM,
          leitura simplificada.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/empresas"
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full px-6 gap-2"
            )}
          >
            Explorar empresas
            <ArrowRightIcon className="size-4" />
          </Link>
          <Link
            href="/comparar"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full px-6 gap-2"
            )}
          >
            <PlayCircleIcon className="size-4" />
            Comparar agora
          </Link>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-6 pt-4 text-[0.8rem] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-foreground">449</span>
            <span>companhias</span>
          </div>
          <span className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-foreground">2.3M</span>
            <span>demonstracoes</span>
          </div>
          <span className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-foreground">60+</span>
            <span>KPIs</span>
          </div>
        </div>
      </div>
    </section>
  );
}
