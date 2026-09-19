import { cn } from "@/core/lib/cn";

import { ThemeRadioOption } from "./theme-radio-option";
import { COLOR_MODES, type Palette,PALETTES } from "./theme-types";

interface ThemePalettePickerProps {
  colorMode: string;
  selectedPalette: Palette | null;
  onSelectColorMode: (mode: string) => void;
  onSelectPalette: (palette: Palette) => void;
}

/** Selector de modo de color y paletas personalizadas para el tema. */
export function ThemePalettePicker({
  colorMode,
  selectedPalette,
  onSelectColorMode,
  onSelectPalette,
}: Readonly<ThemePalettePickerProps>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Paleta de colores
      </p>
      {COLOR_MODES.map((m) => (
        <ThemeRadioOption
          key={m.key}
          label={m.label}
          desc={m.desc}
          checked={colorMode === m.key}
          onClick={() => {
            onSelectColorMode(m.key);
          }}
        />
      ))}

      {colorMode === "custom" && (
        <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
          {PALETTES.map((pal) => (
            <button
              key={pal.name}
              type="button"
              onClick={() => {
                onSelectPalette(pal);
              }}
              title={pal.name}
              className={cn(
                "flex cursor-pointer gap-px rounded-lg border-2 p-0.5 transition",
                selectedPalette?.name === pal.name
                  ? "scale-105 border-primary"
                  : "border-transparent hover:border-border",
              )}
            >
              <div className="h-5 w-5 rounded-l" style={{ background: pal.p }} />
              <div className="h-5 w-5 rounded-r" style={{ background: pal.a }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
