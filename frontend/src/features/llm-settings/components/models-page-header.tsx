import { PageHeader } from "@/core/components/page-header";

export function ModelsPageHeader({ status }: Readonly<{ status: string }>) {
  return (
    <div>
      <PageHeader
        title="Modelos de IA"
        subtitle="Modelo primario, cadena de fallback y API keys por proveedor."
      />
      <p className="pt-1 text-xs text-muted-foreground/80">{status}</p>
    </div>
  );
}
