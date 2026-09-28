import { Icon } from "@/core/components/icon";

export interface AxisOption {
  value: string;
  label: string;
  icon: string;
  /** Muestras de color junto a la etiqueta (la paleta UPAO). */
  swatches?: readonly string[];
}

interface Props {
  label: string;
  hint: string;
  value: string;
  options: readonly AxisOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

const SEGMENT_BASE =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function segmentClass(active: boolean): string {
  return active
    ? `${SEGMENT_BASE} bg-background font-semibold text-foreground shadow-xs ring-1 ring-border dark:bg-input/60`
    : `${SEGMENT_BASE} text-muted-foreground hover:text-foreground`;
}

function swatchDots(colors: readonly string[]) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {colors.map((color) => (
        <span key={color} className="h-3 w-3 rounded-full ring-1 ring-black/20" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

export function OvaThemeAxis({ label, hint, value, options, disabled, onChange }: Readonly<Props>) {
  return (
    <div className="space-y-1.5">
      <p id={`theme-axis-${label}`} className="text-sm font-medium text-foreground">{label}</p>
      <div role="radiogroup" aria-labelledby={`theme-axis-${label}`} className="flex gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-label={`${label}: ${option.label}`}
            aria-checked={value === option.value}
            disabled={disabled}
            className={segmentClass(value === option.value)}
            onClick={() => {
              onChange(option.value);
            }}
          >
            <Icon name={option.icon} size="text-base" className="shrink-0" />
            <span>{option.label}</span>
            {option.swatches && swatchDots(option.swatches)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
