"use client";

import { useId, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
};

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const id = useId();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const isDark = mounted && resolvedTheme === "dark";

  const handleThemeChange = (nextDark: boolean) => {
    if (!mounted) {
      return;
    }

    setTheme(nextDark ? "dark" : "light");
  };

  return (
    <div className={cn("group inline-flex items-center gap-2", className)}>
      <button
        type="button"
        id={`${id}-light`}
        className={cn(
          "cursor-pointer rounded-full p-1 text-left text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-70",
          isDark && "text-foreground/50",
        )}
        aria-controls={id}
        aria-label="Ativar tema claro"
        aria-pressed={mounted && !isDark}
        onClick={() => handleThemeChange(false)}
        disabled={!mounted}
      >
        <SunIcon className="size-4" aria-hidden="true" />
      </button>

      <Switch
        id={id}
        checked={isDark}
        onCheckedChange={handleThemeChange}
        aria-labelledby={`${id}-light ${id}-dark`}
        aria-label="Alternar entre tema claro e escuro"
        disabled={!mounted}
      />

      <button
        type="button"
        id={`${id}-dark`}
        className={cn(
          "cursor-pointer rounded-full p-1 text-right text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-70",
          isDark || "text-foreground/50",
        )}
        aria-controls={id}
        aria-label="Ativar tema escuro"
        aria-pressed={mounted && isDark}
        onClick={() => handleThemeChange(true)}
        disabled={!mounted}
      >
        <MoonIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default ThemeToggle;
