import { cn } from "@/core/lib/cn";

interface ThemeRadioOptionProps {
  name: string;
  value: string;
  label: string;
  desc: string;
  checked?: boolean;
  onSelect: (value: string) => void;
}

/** Opción de un grupo de radios nativo (flechas del teclado incluidas) con descripción. */
export function ThemeRadioOption({
  name,
  value,
  label,
  desc,
  checked = false,
  onSelect,
}: Readonly<ThemeRadioOptionProps>) {
  return (
    <label
      className={cn(
        "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => {
          onSelect(value);
        }}
        className="row-span-2 mt-0.5 size-4 accent-primary outline-none"
      />
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-xs leading-snug text-muted-foreground">{desc}</span>
    </label>
  );
}
