import { PageHeader } from "@/core/components/page-header";

export function ModelsPageHeader({ status }: Readonly<{ status?: string }>) {
  return (
    <div>
      <PageHeader
        title="Modelos de IA"
        subtitle="Modelo primario, cadena de fallback y API keys por proveedor."
      />
      {status ? <p className="pt-1 text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}
