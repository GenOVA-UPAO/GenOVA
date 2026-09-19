import { cn } from "@/core/lib/cn";

interface FlagSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  "aria-label"?: string;
  size?: "sm" | "md";
}

const SIZE = {
  sm: { track: "h-5 w-9", thumb: "h-4 w-4", on: "translate-x-4" },
  md: {
    track: "h-6 w-11",
    thumb: "absolute top-0.5 left-0.5 h-5 w-5",
    on: "translate-x-5",
  },
};

export function FlagSwitch({
  checked,
  disabled = false,
  onToggle,
  "aria-label": ariaLabel,
  size = "md",
}: Readonly<FlagSwitchProps>) {
  const s = SIZE[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      className={cn(
        "relative inline-flex shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        s.track,
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "block rounded-full bg-white shadow-lg transition-transform duration-200",
          s.thumb,
          checked ? s.on : "translate-x-0",
        )}
      />
    </button>
  );
}
