import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Tooltip } from "@/core/components/ui/tooltip";
import { cn } from "@/core/lib/cn";

interface ChainIconButtonProps {
  /** Texto corto del tooltip («Subir»). */
  label: string;
  /** Nombre accesible completo: dice sobre qué fila actúa («Subir respaldo 2»). */
  ariaLabel: string;
  disabled: boolean;
  danger?: boolean;
  onClick: () => void;
  icon: "caret-up" | "caret-down" | "trash";
}

export function ChainIconButton({
  label,
  ariaLabel,
  disabled,
  danger,
  onClick,
  icon,
}: Readonly<ChainIconButtonProps>) {
  return (
    <Tooltip label={label} side="top">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "text-muted-foreground max-sm:size-11",
          danger && "hover:bg-destructive/10 hover:text-destructive",
        )}
      >
        <Icon name={icon} size="text-base" />
      </Button>
    </Tooltip>
  );
}
