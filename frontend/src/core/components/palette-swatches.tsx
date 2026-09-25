import { cn } from "@/core/lib/cn";
import { type Palette, PALETTES } from "@/core/lib/ova-palettes";

interface PaletteSwatchesProps {
  name: string;
  selected: Palette | null | undefined;
  disabled?: boolean;
  onSelect: (palette: Palette) => void;
}

/** Las combinaciones de colores como muestras seleccionables (radio accesible). */
export function PaletteSwatches({
  name,
  selected,
  disabled,
  onSelect,
}: Readonly<PaletteSwatchesProps>) {
  return (
    <fieldset className="flex flex-wrap gap-2" disabled={disabled}>
      <legend className="sr-only">Combinación de colores</legend>
      {PALETTES.map((pal) => {
        const checked = selected?.name === pal.name;
        return (
          <label
            key={pal.name}
            title={pal.name}
            className={cn(
              "flex cursor-pointer gap-px rounded-lg border-2 p-0.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              checked ? "border-primary" : "border-transparent hover:border-border",
            )}
          >
            <input
              type="radio"
              name={name}
              value={pal.name}
              checked={checked}
              onChange={() => {
                onSelect(pal);
              }}
              className="sr-only"
            />
            <span className="sr-only">{pal.name}</span>
            <span
              aria-hidden="true"
              className="size-6 rounded-l-md"
              style={{ background: pal.p }}
            />
            <span
              aria-hidden="true"
              className="size-6 rounded-r-md"
              style={{ background: pal.a }}
            />
          </label>
        );
      })}
    </fieldset>
  );
}
