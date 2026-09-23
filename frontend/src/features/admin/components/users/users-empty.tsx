import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface UsersEmptyProps {
  isFiltering: boolean;
  onClearFilters: () => void;
}

/** Vacío de usuarios: sin registros o sin coincidencias para el criterio. */
export function UsersEmpty({ isFiltering, onClearFilters }: Readonly<UsersEmptyProps>) {
  if (isFiltering) {
    return (
      <EmptyState
        icon="magnifying-glass-minus"
        title="Sin resultados"
        description="No hay coincidencias para ese criterio."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Quitar filtros
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon="users-three"
      title="No hay usuarios"
      description="Cuando se registren en la plataforma aparecerán aquí."
    />
  );
}
