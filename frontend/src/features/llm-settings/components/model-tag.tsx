import type { ReactNode } from "react";

import { cn } from "@/core/lib/cn";

/** Etiqueta pequeña junto al nombre del modelo («Modelo base», «En uso: Texto»). */
export function ModelTag({ children, tone = "muted" }: Readonly<{ children: ReactNode; tone?: "muted" | "primary" }>) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-xs",
        tone === "primary" ? "bg-primary/10 text-primary dark:bg-primary/20" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
