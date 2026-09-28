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
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-foreground">Diseño</legend>
      {DESIGN_MODES.map((m) => (
        <ThemeRadioOption
          key={m.key}
          name="theme-design-mode"
          value={m.key}
          label={m.label}
          desc={m.desc}
          checked={designMode === m.key}
          onSelect={onSelectDesignMode}
        />
      ))}
    </fieldset>
  );
}
