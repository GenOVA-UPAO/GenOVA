import { cn } from "@/core/lib/cn";

interface FilterChipProps {
  label: string;
  title?: string;
  pressed: boolean;
  onClick: () => void;
}

/** Filtro rápido que se activa y desactiva (botón con aria-pressed). */
export function FilterChip({ label, title, pressed, onClick }: Readonly<FilterChipProps>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs whitespace-nowrap transition-colors outline-none after:absolute after:-inset-y-1.5 after:content-[''] focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:h-8 max-sm:after:-inset-y-2",
        pressed
          ? "border-primary/40 bg-primary/10 font-medium text-primary dark:bg-primary/20"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-input/30",
      )}
    >
      {label}
    </button>
  );
}
