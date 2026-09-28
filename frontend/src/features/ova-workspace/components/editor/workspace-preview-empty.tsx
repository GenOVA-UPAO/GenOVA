import { EmptyState } from "@/core/components/empty-state";

/** El OVA se quedó sin recursos (se eliminaron todos): se explica cómo volver a llenarlo. */
export function WorkspacePreviewEmpty() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon="eye"
        title="Este OVA no tiene recursos"
        description="Ve a «Editar» y usa «Añadir recurso» en una fase para crear el primero."
      />
    </div>
  );
}
