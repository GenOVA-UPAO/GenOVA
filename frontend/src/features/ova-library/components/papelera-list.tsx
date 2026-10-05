import i18n from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import type { OvaListItem } from "../lib/types";
import { TrashedOvaRow } from "./cards/trashed-ova-row";
import { PapeleraSkeleton } from "./papelera-skeleton";

interface PapeleraListProps {
  isLoading: boolean;
  isStale?: boolean;
  error: unknown;
  ovas: OvaListItem[];
  selectedIds: Set<string>;
  restoringId: string | null;
  deletingId: string | null;
  /** Cabecera con selección múltiple, dentro del mismo contenedor. */
  toolbar: ReactNode;
  onToggleSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (ova: OvaListItem) => void;
  onRetry: () => void;
}

/** Estado de carga, error, vacío o la lista de OVAs de la papelera. */
export function PapeleraList({
  isLoading,
  isStale = false,
  error,
  ovas,
  selectedIds,
  restoringId,
  deletingId,
  toolbar,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
  onRetry,
}: Readonly<PapeleraListProps>) {
  useTranslation();
  if (isLoading) return <PapeleraSkeleton />;

  if (error) {
    return (
      <QueryErrorState
        title={i18n.t("ova-library:no_se_pudo_cargar_la_papelera")}
        onRetry={onRetry}
      />
    );
  }

  if (ovas.length === 0) {
    return (
      <EmptyState
        icon="trash"
        title={i18n.t("ova-library:tu_papelera_esta_vacia")}
        description={i18n.t("ova-library:los_ovas_que_muevas_a_la_papelera_apareceran_aqui")}
        action={
          <Button asChild variant="outline">
            <Link to="/mis-ovas">{i18n.t("ova-library:ir_a_mis_ovas")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section
      aria-label={i18n.t("ova-library:ovas_en_la_papelera")}
      className="overflow-clip rounded-xl border border-border bg-card"
    >
      {toolbar}
      <ul
        aria-busy={isStale}
        className={cn(
          "divide-y divide-border transition-opacity duration-150",
          isStale && "opacity-60",
        )}
      >
        {ovas.map((ova) => (
          <TrashedOvaRow
            key={ova.id}
            ova={ova}
            isSelected={selectedIds.has(ova.id)}
            isRestoring={restoringId === ova.id}
            isDeleting={deletingId === ova.id}
            onToggleSelect={onToggleSelect}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
          />
        ))}
      </ul>
    </section>
  );
}
