import { Checkbox } from "@/core/components/ui/checkbox";

interface ApplyFallbacksOptionProps {
  checked: boolean;
  /** Nombres de los respaldos que se copiarían. */
  names: string[];
  onChange: (checked: boolean) => void;
}

/** Casilla para copiar también los respaldos, diciendo cuáles sustituyen a los actuales. */
export function ApplyFallbacksOption({
  checked,
  names,
  onChange,
}: Readonly<ApplyFallbacksOptionProps>) {
  return (
    <div className="flex items-start gap-3 px-1 py-1 text-sm">
      <Checkbox
        id="apply-with-fallbacks"
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(value) => {
          onChange(value === true);
        }}
      />
      <label htmlFor="apply-with-fallbacks" className="cursor-pointer">
        Copiar también los respaldos
        <span className="block text-xs text-muted-foreground">
          Sustituye los de esas tareas por: {names.join(", ")}.
        </span>
      </label>
    </div>
  );
}
