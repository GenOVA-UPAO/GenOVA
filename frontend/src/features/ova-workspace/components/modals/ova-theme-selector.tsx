import i18n from "i18next";
import { useTranslation } from "react-i18next";

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
  { value: "free", get label() { return i18n.t("workspace:ia_elige"); }, icon: "sparkle" },
  { value: "custom", get label() { return i18n.t("workspace:paleta"); }, icon: "palette" },
];

const DESIGN_OPTIONS: readonly AxisOption[] = [
  { value: "upao", label: "UPAO", icon: "square-half" },
  { value: "free", get label() { return i18n.t("workspace:ia_elige"); }, icon: "sparkle" },
];

interface Props {
  theme: OvaTheme;
  disabled?: boolean;
  onChange: (theme: OvaTheme) => void;
}

function themeNote(theme: OvaTheme): string {
  if (theme.color === "free" || theme.design === "free") {
    return i18n.t("workspace:la_ia_decidira_lo_marcado_como_ia_elige");
  }
  if (theme.color === "custom" && theme.palette) {
    return i18n.t("workspace:paletteReadabilityHint", { p0: theme.palette.name });
  }
  return i18n.t("workspace:marca_institucional_upao_azul_naranja_y_blanco");
}

export function OvaThemeSelector({ theme, disabled, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <section aria-label={t("workspace:tema_del_ova")} className="space-y-5">
      <div className="space-y-3">
        <OvaThemeAxis
          label={t("workspace:color")}
          hint={t("workspace:paleta_de_colores_de_los_recursos")}
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
        label={t("workspace:diseno")}
        hint={t("workspace:estructura_y_maquetacion_de_cada_recurso")}
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
