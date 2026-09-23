import { Icon } from "@/core/components/icon";

import type { OvaTheme } from "../../lib/types";
import { OvaThemeAxis } from "./ova-theme-axis";

interface Props {
  theme: OvaTheme;
  disabled?: boolean;
  onChange: (theme: OvaTheme) => void;
}

export function OvaThemeSelector({ theme, disabled, onChange }: Readonly<Props>) {
  const withFree = theme.color === "free" || theme.design === "free";
  return (
    <section aria-label="Tema del OVA" className="space-y-5">
      <OvaThemeAxis
        label="Color"
        hint="Paleta de colores de los recursos."
        value={theme.color}
        withSwatches
        disabled={disabled}
        onChange={(color) => {
          onChange({ ...theme, color });
        }}
      />
      <OvaThemeAxis
        label="Diseño"
        hint="Estructura y maquetación de cada recurso."
        value={theme.design}
        disabled={disabled}
        onChange={(design) => {
          onChange({ ...theme, design });
        }}
      />
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Icon name="magic-wand" size="text-sm" className="mt-0.5 shrink-0" />
        {withFree
          ? "La IA decidirá lo marcado como «Libre»."
          : "Marca institucional UPAO: azul, naranja y blanco."}
      </p>
    </section>
  );
}
