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
  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function segmentClass(active: boolean): string {
  return active
    ? `${SEGMENT_BASE} bg-background text-foreground shadow-sm ring-1 ring-primary/30`
    : `${SEGMENT_BASE} text-muted-foreground hover:text-foreground hover:bg-background/60`;
}

export function OvaThemeAxis({ label, hint, value, withSwatches, disabled, onChange }: Readonly<Props>) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <div role="radiogroup" className="flex gap-1 rounded-lg bg-muted/50 p-1">
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
          <Icon name="square-half" size="text-sm" className="shrink-0" />
          <span>UPAO</span>
          {withSwatches && (
            <span className="flex items-center gap-0.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: "#0A3D91" }} />
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: "#F47A20" }} />
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: "#FFFFFF" }} />
            </span>
          )}
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
          <Icon name="sparkle" size="text-sm" className="shrink-0" />
          <span>Libre</span>
        </button>
      </div>
    </div>
  );
}
