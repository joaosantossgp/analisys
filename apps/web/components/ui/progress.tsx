"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

type ProgressProps = ProgressPrimitive.Root.Props & {
  trackClassName?: string
  indicatorClassName?: string
}

function Progress({
  className,
  children,
  value,
  trackClassName,
  indicatorClassName,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}
      <ProgressTrack className={trackClassName}>
        <ProgressIndicator className={indicatorClassName} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({
  className,
  ...props
}: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-foreground/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:bg-background/70",
        className,
      )}
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "h-full rounded-full bg-primary transition-[translate,width] duration-500 ease-out",
        className,
      )}
      {...props}
    />
  )
}

function ProgressLabel({
  className,
  ...props
}: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  ...props
}: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn("text-sm font-medium tabular-nums text-foreground", className)}
      {...props}
    />
  )
}

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
}
