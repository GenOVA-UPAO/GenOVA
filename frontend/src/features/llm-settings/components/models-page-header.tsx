import { PageHeader } from "@/core/components/page-header";

export function ModelsPageHeader({ status }: Readonly<{ status?: string }>) {
  return (
    <PageHeader
      title="Modelos de IA"
      subtitle={
        <>
          Elige qué modelo usa cada tarea y cuáles lo respaldan si falla.
          {status ? <span className="mt-1 block text-xs">{status}</span> : null}
        </>
      }
    />
  );
}
