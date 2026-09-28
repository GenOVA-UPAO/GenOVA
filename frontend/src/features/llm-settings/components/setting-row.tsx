import type { ReactNode } from "react";

interface SettingRowProps {
  title: ReactNode;
  description?: ReactNode;
  /** Control a la derecha (interruptor, estado fijo...). */
  control: ReactNode;
  /** Contenido extra bajo la fila (campos que aparecen al activar). */
  children?: ReactNode;
}

/** Fila de ajuste dentro de una lista `divide-y`: texto a la izquierda, control a la derecha. */
export function SettingRow({ title, description, control, children }: Readonly<SettingRowProps>) {
  return (
    <li className="space-y-4 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">
            {title}
          </div>
          {description ? (
            <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">{control}</div>
      </div>
      {children}
    </li>
  );
}
