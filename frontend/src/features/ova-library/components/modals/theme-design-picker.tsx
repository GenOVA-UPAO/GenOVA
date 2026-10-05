import { useTranslation } from "react-i18next";

import { ThemeRadioOption } from "./theme-radio-option";
import { DESIGN_MODES } from "./theme-types";

interface ThemeDesignPickerProps {
  designMode: string;
  onSelectDesignMode: (mode: string) => void;
}

/** Selector del diseño (plantilla) de los OVAs. */
export function ThemeDesignPicker({
  designMode,
  onSelectDesignMode,
}: Readonly<ThemeDesignPickerProps>) {
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-foreground">
        {t("ova-library:diseno")}
      </legend>
      {DESIGN_MODES.map((m) => (
        <ThemeRadioOption
          key={m.key}
          name="theme-design-mode"
          value={m.key}
          label={t(m.labelKey)}
          desc={t(m.descKey)}
          checked={designMode === m.key}
          onSelect={onSelectDesignMode}
        />
      ))}
    </fieldset>
  );
}
