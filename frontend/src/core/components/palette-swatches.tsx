import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-wrap gap-2" disabled={disabled}>
      <legend className="sr-only">{t("shared:combinacion_de_colores")}</legend>
      {PALETTES.map((pal) => {
        const checked = selected?.p === pal.p && selected.a === pal.a;
        const label = pal.nameKey ? t(pal.nameKey) : pal.name;
        return (
          <label
            key={pal.p}
            title={label}
            className={cn(
              "flex cursor-pointer gap-px rounded-lg border-2 p-0.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              checked ? "border-primary" : "border-transparent hover:border-border",
            )}
          >
            <input
              type="radio"
              name={name}
              value={pal.p}
              checked={checked}
              onChange={() => {
                onSelect(pal);
              }}
              className="sr-only"
            />
            <span className="sr-only">{label}</span>
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
