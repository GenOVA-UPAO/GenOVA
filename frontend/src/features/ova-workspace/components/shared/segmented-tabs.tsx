import type { KeyboardEvent } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
  /** id del panel que muestra esta opción (aria-controls). */
  controls?: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

function tabClass(active: boolean): string {
  return cn(
    "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-3 max-md:h-9 text-sm font-medium whitespace-nowrap transition-colors duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-background text-foreground shadow-xs ring-1 ring-border dark:bg-input/60"
      : "text-muted-foreground hover:text-foreground",
  );
}

/**
 * Control segmentado con semántica de pestañas: el activo es evidente por
 * fondo, sombra y peso; las flechas mueven entre opciones.
 */
export function SegmentedTabs<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: Readonly<Props<T>>) {
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = options.findIndex((option) => option.value === value);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + step + options.length) % options.length;
    onChange(options[nextIndex].value);
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.item(nextIndex).focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex rounded-lg bg-muted p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={option.controls}
            tabIndex={active ? 0 : -1}
            className={tabClass(active)}
            onKeyDown={move}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.icon && <Icon name={option.icon} className="size-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
