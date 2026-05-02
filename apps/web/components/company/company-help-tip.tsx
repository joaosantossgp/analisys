"use client";

import { CircleHelpIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CompanyHelpTipProps = {
  children: string;
  label?: string;
  className?: string;
};

export function CompanyHelpTip({
  children,
  label = "Mais informacoes",
  className,
}: CompanyHelpTipProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        >
          <CircleHelpIcon className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-72 text-xs leading-5"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
