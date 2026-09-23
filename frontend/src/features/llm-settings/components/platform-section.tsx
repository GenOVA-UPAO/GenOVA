import type { ReactNode } from "react";

interface PlatformSectionProps {
  title: string;
  description: string;
  /** Acción de la sección (p. ej. «Guardar cambios» cuando hay cambios). */
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}

/** Sección de la pestaña Plataforma: título, descripción y su contenido debajo. */
export function PlatformSection({
  title,
  description,
  action,
  children,
  testId,
}: Readonly<PlatformSectionProps>) {
  return (
    <section className="space-y-4" data-testid={testId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
