import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/core/lib/cn";

type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
};

function Switch({ className, size = "default", ...props }: Readonly<SwitchProps>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-5 data-[size=sm]:w-9 data-[state=checked]:bg-primary dark:data-[state=unchecked]:bg-input/80",
        // Área táctil mayor que el control visible.
        "after:absolute after:-inset-2",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background shadow-xs ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 data-[state=checked]:group-data-[size=default]/switch:translate-x-5 data-[state=checked]:group-data-[size=sm]/switch:translate-x-4 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
