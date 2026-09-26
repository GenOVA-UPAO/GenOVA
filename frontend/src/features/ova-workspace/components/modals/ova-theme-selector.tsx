import { Icon } from "@/core/components/icon";
import { PaletteSwatches } from "@/core/components/palette-swatches";
import { PALETTES } from "@/core/lib/ova-palettes";

import type { OvaTheme } from "../../lib/types";
import { type AxisOption, OvaThemeAxis } from "./ova-theme-axis";

const COLOR_OPTIONS: readonly AxisOption[] = [
  {
    value: "upao",
    label: "UPAO",
    icon: "square-half",
    swatches: ["#0A3D91", "#F47A20", "#FFFFFF"],
  },
  { value: "free", label: "IA elige", icon: "sparkle" },
  { value: "custom", label: "Paleta", icon: "palette" },
];

const DESIGN_OPTIONS: readonly AxisOption[] = [
  { value: "upao", label: "UPAO", icon: "square-half" },
  { value: "free", label: "IA elige", icon: "sparkle" },
];

interface Props {
  theme: OvaTheme;
  disabled?: boolean;
  onChange: (theme: OvaTheme) => void;
}

function themeNote(theme: OvaTheme): string {
  if (theme.color === "free" || theme.design === "free") {
    return "La IA decidirá lo marcado como «IA elige».";
  }
  if (theme.color === "custom" && theme.palette) {
    return `Paleta ${theme.palette.name}: el texto se oscurece lo necesario para leerse bien.`;
  }
  return "Marca institucional UPAO: azul, naranja y blanco.";
}

export function OvaThemeSelector({ theme, disabled, onChange }: Readonly<Props>) {
  return (
    <section aria-label="Tema del OVA" className="space-y-5">
      <div className="space-y-3">
        <OvaThemeAxis
          label="Color"
          hint="Paleta de colores de los recursos."
          value={theme.color}
          options={COLOR_OPTIONS}
          disabled={disabled}
          onChange={(color) => {
            // «Paleta» sin combinación elegida no tendría colores que aplicar.
            const palette = color === "custom" ? (theme.palette ?? PALETTES[1]) : theme.palette;
            onChange({ ...theme, color, palette });
          }}
        />
        {theme.color === "custom" && (
          <PaletteSwatches
            name="ova-theme-palette"
            selected={theme.palette}
            disabled={disabled}
            onSelect={(palette) => {
              onChange({ ...theme, palette });
            }}
          />
        )}
      </div>
      <OvaThemeAxis
        label="Diseño"
        hint="Estructura y maquetación de cada recurso."
        value={theme.design}
        options={DESIGN_OPTIONS}
        disabled={disabled}
        onChange={(design) => {
          onChange({ ...theme, design });
        }}
      />
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Icon name="magic-wand" size="text-sm" className="mt-0.5 shrink-0" />
        {themeNote(theme)}
      </p>
    </section>
  );
}
