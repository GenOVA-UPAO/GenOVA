import { useTranslation } from "react-i18next";

import { PaletteSwatches } from "@/core/components/palette-swatches";
import { type Palette } from "@/core/lib/ova-palettes";

import { ThemeRadioOption } from "./theme-radio-option";
import { COLOR_MODES } from "./theme-types";

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
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-foreground">
        {t("ova-library:colores")}
      </legend>
      {COLOR_MODES.map((m) => (
        <ThemeRadioOption
          key={m.key}
          name="theme-color-mode"
          value={m.key}
          label={t(m.labelKey)}
          desc={t(m.descKey)}
          checked={colorMode === m.key}
          onSelect={onSelectColorMode}
        />
      ))}

      {colorMode === "custom" && (
        <div className="pt-1 pl-1">
          <PaletteSwatches
            name="theme-palette"
            selected={selectedPalette}
            onSelect={onSelectPalette}
          />
        </div>
      )}
    </fieldset>
  );
}
