import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface UsersEmptyProps {
  searchQuery: string;
  onClearSearch: () => void;
}

/** Vacío de usuarios: sin registros o sin resultados de búsqueda. */
export function UsersEmpty({ searchQuery, onClearSearch }: Readonly<UsersEmptyProps>) {
  if (searchQuery !== "") {
    return (
      <EmptyState
        className="border-0 bg-transparent"
        icon="magnifying-glass-minus"
        title="Sin resultados"
        description={`No hay usuarios que coincidan con «${searchQuery}».`}
        action={
          <Button variant="outline" onClick={onClearSearch}>
            Limpiar búsqueda
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      className="border-0 bg-transparent"
      icon="users-three"
      title="No hay usuarios"
      description="Cuando se registren en la plataforma aparecerán aquí."
    />
  );
}
