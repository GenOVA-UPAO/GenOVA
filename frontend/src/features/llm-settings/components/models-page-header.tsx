import type { ReactNode } from "react";

import { PageHeader } from "@/core/components/page-header";

interface ModelsPageHeaderProps {
  status?: string;
  /** Sin clave propia un usuario solo consulta: «Elige…» prometía algo que no podía hacer. */
  canEdit?: boolean;
  /** Perfiles e historial (solo admin). */
  actions?: ReactNode;
}

export function ModelsPageHeader({
  status,
  canEdit = true,
  actions,
}: Readonly<ModelsPageHeaderProps>) {
  return (
    <PageHeader
      title="Modelos de IA"
      actions={actions}
      subtitle={
        <>
          {canEdit
            ? "Elige qué modelo usa cada tarea y cuáles lo respaldan si falla."
            : "Consulta qué modelo usa cada tarea al generar tus OVAs y cuáles lo respaldan si falla."}
          {status ? <span className="mt-1 block text-xs">{status}</span> : null}
        </>
      }
    />
  );
}
