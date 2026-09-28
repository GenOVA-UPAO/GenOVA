import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { statusLabel } from "../pages/mis-ovas-page.helpers";

interface MisOvasEmptyProps {
  search: string;
  status: string;
  onClearFilters: () => void;
}

function noResultsDescription(search: string, status: string): string {
  const byStatus = status === "all" ? "" : ` en estado «${statusLabel(status)}»`;
  if (search) return `No hay OVAs${byStatus} cuyo título contenga «${search}».`;
  return `No hay OVAs${byStatus}.`;
}

function clearLabel(search: string, status: string): string {
  if (status === "all") return "Limpiar búsqueda";
  return search ? "Limpiar filtros" : "Ver todos los estados";
}

/** Estado vacío de la biblioteca: sin OVAs todavía o sin resultados para el filtro. */
export function MisOvasEmpty({ search, status, onClearFilters }: Readonly<MisOvasEmptyProps>) {
  const trimmed = search.trim();
  if (trimmed !== "" || status !== "all") {
    return (
      <EmptyState
        icon="magnifying-glass-minus"
        title="Sin resultados"
        description={noResultsDescription(trimmed, status)}
        action={
          <Button variant="outline" onClick={onClearFilters}>
            {clearLabel(trimmed, status)}
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon="folder"
      title="Aún no has creado ningún OVA"
      description="Describe un tema y el asistente generará tu primer objeto virtual de aprendizaje, listo para editar y descargar."
      action={
        <Button asChild>
          <Link to="/crear">
            <Icon name="plus" size="text-base" />
            Crear mi primer OVA
          </Link>
        </Button>
      }
    />
  );
}
