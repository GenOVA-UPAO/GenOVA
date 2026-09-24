import { PageHeader } from "@/core/components/page-header";

interface ModelsPageHeaderProps {
  status?: string;
  /** Sin clave propia un usuario solo consulta: «Elige…» prometía algo que no podía hacer. */
  canEdit?: boolean;
}

export function ModelsPageHeader({ status, canEdit = true }: Readonly<ModelsPageHeaderProps>) {
  return (
    <PageHeader
      title="Modelos de IA"
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
