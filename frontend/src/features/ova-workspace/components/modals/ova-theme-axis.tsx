import { Icon } from "@/core/components/icon";

interface Props {
  label: string;
  hint: string;
  value: string;
  withSwatches?: boolean;
  disabled?: boolean;
  onChange: (value: "upao" | "free") => void;
}

const SEGMENT_BASE =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function segmentClass(active: boolean): string {
  return active
    ? `${SEGMENT_BASE} bg-primary text-primary-foreground shadow-sm`
    : `${SEGMENT_BASE} text-muted-foreground hover:bg-background/70 hover:text-foreground`;
}

function swatchDots() {
  const upao = ["#0A3D91", "#F47A20", "#FFFFFF"];
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {upao.map((color) => (
        <span key={color} className="h-3 w-3 rounded-full ring-1 ring-black/20" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

export function OvaThemeAxis({ label, hint, value, withSwatches, disabled, onChange }: Readonly<Props>) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-lg border border-border bg-muted/60 p-1">
        <button
          type="button"
          role="radio"
          aria-label={`${label} UPAO`}
          aria-checked={value === "upao"}
          disabled={disabled}
          className={segmentClass(value === "upao")}
          onClick={() => {
            onChange("upao");
          }}
        >
          <Icon name="square-half" size="text-base" className="shrink-0" />
          <span>UPAO</span>
          {withSwatches && swatchDots()}
        </button>
        <button
          type="button"
          role="radio"
          aria-label={`${label} libre`}
          aria-checked={value === "free"}
          disabled={disabled}
          className={segmentClass(value === "free")}
          onClick={() => {
            onChange("free");
          }}
        >
          <Icon name="sparkle" size="text-base" className="shrink-0" />
          <span>Libre</span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
