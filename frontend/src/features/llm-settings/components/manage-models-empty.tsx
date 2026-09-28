import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface ManageModelsEmptyProps {
  /** `keys`: sin clave propia; `filters`: nada coincide; `catalog`: ningún proveedor dio su lista. */
  kind: "keys" | "filters" | "catalog";
  onAddKey: () => void;
  onClearFilters: () => void;
}

export function ManageModelsEmpty({ kind, onAddKey, onClearFilters }: Readonly<ManageModelsEmptyProps>) {
  if (kind === "keys") {
    return (
      <EmptyState
        className="m-5 border-0"
        icon="lock"
        title="Aún no tienes claves API"
        description="Añade la clave de un proveedor para ver sus modelos y elegir tus favoritos."
        action={<Button onClick={onAddKey}>Añadir clave API</Button>}
      />
    );
  }
  if (kind === "catalog") {
    return (
      <EmptyState
        className="m-5 border-0"
        icon="squares-four"
        title="El catálogo está vacío"
        description="Ningún proveedor conectado ha dado su lista de modelos. Conecta uno o revisa su clave en Credenciales."
        action={<Button onClick={onAddKey}>Ir a Credenciales</Button>}
      />
    );
  }
  return (
    <EmptyState
      className="m-5 border-0"
      icon="magnifying-glass-minus"
      title="Ningún modelo coincide"
      description="Prueba con otra búsqueda o quita algún filtro."
      action={
        <Button variant="outline" onClick={onClearFilters}>
          Quitar filtros
        </Button>
      }
    />
  );
}
