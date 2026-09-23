import type { ReactNode } from "react";

import { cn } from "@/core/lib/cn";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Botones o enlaces alineados a la derecha (debajo del título en móvil). */
  actions?: ReactNode;
  className?: string;
}

/** Cabecera uniforme de página: h1 + subtítulo + acciones. */
export function PageHeader({ title, subtitle, actions, className }: Readonly<PageHeaderProps>) {
  return (
    <header
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle !== undefined && (
          <p className="mt-2 max-w-prose text-sm text-muted-foreground sm:text-[0.9375rem]">{subtitle}</p>
        )}
      </div>
      {actions !== undefined && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
