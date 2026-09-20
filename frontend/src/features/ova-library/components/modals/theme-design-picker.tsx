import { ThemeRadioOption } from "./theme-radio-option";
import { DESIGN_MODES } from "./theme-types";

interface ThemeDesignPickerProps {
  designMode: string;
  onSelectDesignMode: (mode: string) => void;
}

/** Selector de modo de diseño/plantilla para el modal de temas. */
export function ThemeDesignPicker({
  designMode,
  onSelectDesignMode,
}: Readonly<ThemeDesignPickerProps>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Diseño / Plantilla
      </p>
      {DESIGN_MODES.map((m) => (
        <ThemeRadioOption
          key={m.key}
          label={m.label}
          desc={m.desc}
          checked={designMode === m.key}
          onClick={() => { onSelectDesignMode(m.key); }}
        />
      ))}
    </div>
  );
}
