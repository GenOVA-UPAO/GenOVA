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
  /** `danger` tiñe el icono de rojo: para estados de error, no de vacío. */
  tone?: "default" | "danger";
  className?: string;
}

export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
  tone = "default",
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-2 flex size-12 items-center justify-center rounded-full",
          tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
      >
        <Icon name={icon} size="text-2xl" />
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description !== undefined && (
        <p className="max-w-md text-sm text-pretty text-muted-foreground">{description}</p>
      )}
      {action !== undefined && <div className="pt-3">{action}</div>}
    </div>
  );
}
