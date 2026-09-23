import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface ManageModelsEmptyProps {
  kind: "keys" | "filters";
  onAddKey: () => void;
  onClearFilters: () => void;
}

export function ManageModelsEmpty({
  kind,
  onAddKey,
  onClearFilters,
}: Readonly<ManageModelsEmptyProps>) {
  if (kind === "keys") {
    return (
      <EmptyState
        className="m-5 border-0"
        icon="lock"
        title="Aún no tienes claves API"
        description="Añade la clave de un proveedor para ver sus modelos y activarlos."
        action={<Button onClick={onAddKey}>Añadir clave API</Button>}
      />
    );
  }
  return (
    <EmptyState
      className="m-5 border-0"
      icon="magnifying-glass-minus"
      title="Ningún modelo coincide"
      description="Prueba con otro tipo, otra categoría u otra búsqueda."
      action={
        <Button variant="outline" onClick={onClearFilters}>
          Quitar filtros
        </Button>
      }
    />
  );
}
