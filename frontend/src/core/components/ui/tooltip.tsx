import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactElement } from "react";

import { cn } from "@/core/lib/cn";

function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: Readonly<ComponentProps<typeof TooltipPrimitive.Content>>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-xs data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

interface TooltipProps {
  /** Texto del tooltip. Si es null, se pinta solo el hijo. */
  label: string | null;
  side?: "top" | "right" | "bottom" | "left";
  /** Un único elemento enfocable (enlace o botón). */
  children: ReactElement;
}

/**
 * Tooltip para controles que solo muestran un icono. Sale al pasar el ratón y
 * también al llegar con el teclado, a diferencia de `title`. El control debe
 * seguir teniendo su propio `aria-label`: el tooltip es una ayuda visual.
 */
function Tooltip({ label, side = "right", children }: Readonly<TooltipProps>) {
  if (label === null) return children;
  return (
    <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
