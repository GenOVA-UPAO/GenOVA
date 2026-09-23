import { cn } from "@/core/lib/cn";

import { ThemeRadioOption } from "./theme-radio-option";
import { COLOR_MODES, type Palette, PALETTES } from "./theme-types";

interface ThemePalettePickerProps {
  colorMode: string;
  selectedPalette: Palette | null;
  onSelectColorMode: (mode: string) => void;
  onSelectPalette: (palette: Palette) => void;
}

/** Selector del modo de color y, en «Personalizado», de la combinación concreta. */
export function ThemePalettePicker({
  colorMode,
  selectedPalette,
  onSelectColorMode,
  onSelectPalette,
}: Readonly<ThemePalettePickerProps>) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-foreground">Colores</legend>
      {COLOR_MODES.map((m) => (
        <ThemeRadioOption
          key={m.key}
          name="theme-color-mode"
          value={m.key}
          label={m.label}
          desc={m.desc}
          checked={colorMode === m.key}
          onSelect={onSelectColorMode}
        />
      ))}

      {colorMode === "custom" && (
        <fieldset className="flex flex-wrap gap-2 pt-1 pl-1">
          <legend className="sr-only">Combinación de colores</legend>
          {PALETTES.map((pal) => {
            const checked = selectedPalette?.name === pal.name;
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
                  name="theme-palette"
                  value={pal.name}
                  checked={checked}
                  onChange={() => {
                    onSelectPalette(pal);
                  }}
                  className="sr-only"
                />
                <span className="sr-only">{pal.name}</span>
                <span aria-hidden="true" className="size-6 rounded-l-md" style={{ background: pal.p }} />
                <span aria-hidden="true" className="size-6 rounded-r-md" style={{ background: pal.a }} />
              </label>
            );
          })}
        </fieldset>
      )}
    </fieldset>
  );
}
