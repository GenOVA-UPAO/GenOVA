import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

interface ChainIconButtonProps {
  label: string;
  disabled: boolean;
  danger?: boolean;
  onClick: () => void;
  icon: "caret-up" | "caret-down" | "trash";
}

export function ChainIconButton({
  label,
  disabled,
  danger,
  onClick,
  icon,
}: Readonly<ChainIconButtonProps>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-1.5 shadow-sm transition-colors disabled:opacity-30",
        danger
          ? "ml-1 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border/50 bg-card/50 text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon name={icon} size="text-base" />
    </button>
  );
}
