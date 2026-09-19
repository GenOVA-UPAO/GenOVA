import type { ReactNode } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

interface EmptyStateProps {
  /** Nombre del icono del registro (`<Icon name>`). */
  icon?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Acción principal (p. ej. un botón "Crear OVA"). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name={icon} size="text-3xl" />
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description !== undefined && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action !== undefined && <div className="pt-2">{action}</div>}
    </div>
  );
}
