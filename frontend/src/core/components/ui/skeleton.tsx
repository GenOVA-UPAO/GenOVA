import type { ComponentProps } from "react";

import { cn } from "@/core/lib/cn";

function Skeleton({ className, ...props }: Readonly<ComponentProps<"div">>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
