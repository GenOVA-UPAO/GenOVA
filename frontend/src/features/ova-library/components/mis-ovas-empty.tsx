import i18n from "i18next";
import { useTranslation } from "react-i18next";
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
  const byStatus =
    status === "all" ? "" : i18n.t("ova-library:withStatus", { status: statusLabel(status) });
  if (search)
    return i18n.t("ova-library:no_hay_ovasvalue_cuyo_titulo_contenga_value", {
      p0: byStatus,
      p1: search,
    });
  return i18n.t("ova-library:no_hay_ovasvalue", { p0: byStatus });
}

function clearLabel(search: string, status: string): string {
  if (status === "all") return i18n.t("ova-library:limpiar_busqueda");
  return search
    ? i18n.t("ova-library:limpiar_filtros")
    : i18n.t("ova-library:ver_todos_los_estados");
}

/** Estado vacío de la biblioteca: sin OVAs todavía o sin resultados para el filtro. */
export function MisOvasEmpty({ search, status, onClearFilters }: Readonly<MisOvasEmptyProps>) {
  const { t } = useTranslation();
  const trimmed = search.trim();
  if (trimmed !== "" || status !== "all") {
    return (
      <EmptyState
        icon="magnifying-glass-minus"
        title={t("ova-library:sin_resultados")}
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
      title={t("ova-library:aun_no_has_creado_ningun_ova")}
      description={t(
        "ova-library:describe_un_tema_y_el_asistente_generara_tu_primer_objeto_virtual_de_aprendizaje_listo_par",
      )}
      action={
        <Button asChild>
          <Link to="/crear">
            <Icon name="plus" size="text-base" />
            {t("ova-library:crear_mi_primer_ova")}{" "}
          </Link>
        </Button>
      }
    />
  );
}
