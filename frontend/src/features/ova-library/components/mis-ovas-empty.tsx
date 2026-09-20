import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface MisOvasEmptyProps {
  isFiltering: boolean;
  onClearFilters: () => void;
}

/** Estado vacío para la grilla de Mis OVAs (con o sin filtros activos). */
export function MisOvasEmpty({ isFiltering, onClearFilters }: Readonly<MisOvasEmptyProps>) {
  if (isFiltering) {
    return (
      <EmptyState
        icon="magnifying-glass-minus"
        title="Sin resultados para tu búsqueda"
        description="Prueba con otros términos de búsqueda o cambia el filtro de estado actual."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon="folder"
      title="Aún no has creado ningún OVA"
      description="Empieza generando tu primer objeto virtual de aprendizaje. Nuestro asistente de IA te guiará en el proceso."
      action={
        <Button asChild className="gap-1.5 shadow-sm">
          <Link to="/crear">
            <Icon name="plus" size="text-base" />
            Crear mi primer OVA
          </Link>
        </Button>
      }
    />
  );
}
