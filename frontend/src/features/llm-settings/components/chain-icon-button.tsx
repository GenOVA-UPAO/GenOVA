import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-muted-foreground max-sm:size-11",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon name={icon} size="text-base" />
    </Button>
  );
}
