import { cn } from "@/core/lib/cn";

interface ThemeRadioOptionProps {
  label: string;
  desc: string;
  checked?: boolean;
  onClick?: () => void;
}

/** Opción seleccionable tipo radio para la configuración del tema. */
export function ThemeRadioOption({
  label,
  desc,
  checked = false,
  onClick,
}: Readonly<ThemeRadioOptionProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition",
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-primary" : "border-muted-foreground/40",
        )}
      >
        {checked && <div className="size-2 rounded-full bg-primary" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
