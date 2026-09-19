import { Icon } from "@/core/components/icon";

import type { OvaTheme } from "../../lib/types";
import { OvaThemeAxis } from "./ova-theme-axis";

interface Props {
  theme: OvaTheme;
  disabled?: boolean;
  onChange: (theme: OvaTheme) => void;
}

export function OvaThemeSelector({ theme, disabled, onChange }: Readonly<Props>) {
  return (
    <section className="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tema del OVA</p>
      <OvaThemeAxis
        label="Color"
        hint="paleta de los recursos"
        value={theme.color}
        withSwatches
        disabled={disabled}
        onChange={(color) => {
          onChange({ ...theme, color });
        }}
      />
      <OvaThemeAxis
        label="Diseño"
        hint="estructura del recurso"
        value={theme.design}
        disabled={disabled}
        onChange={(design) => {
          onChange({ ...theme, design });
        }}
      />
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon name="magic-wand" size="text-xs" className="shrink-0" />
        {theme.color === "free" || theme.design === "free" ? "La IA decidirá lo marcado como «Libre»." : "Marca institucional UPAO: azul, naranja y blanco."}
      </p>
    </section>
  );
}
