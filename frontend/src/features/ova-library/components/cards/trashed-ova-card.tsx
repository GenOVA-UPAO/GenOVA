import { Button } from "@/core/components/ui/button";

import type { OvaListItem } from "../../lib/types";
import { OvaCardShell } from "./ova-card-shell";

interface TrashedOvaCardProps {
  ova: OvaListItem;
  isSelected?: boolean;
  isRestoring?: boolean;
  isDeleting?: boolean;
  onToggleSelect?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (ova: OvaListItem) => void;
}

function formatDate(date: unknown): string {
  if (!date) return "";
  return new Date(date as string).toLocaleDateString("es-PE");
}

/** Tarjeta de OVA en la papelera con opciones de restaurar o eliminar definitivamente. */
export function TrashedOvaCard({
  ova,
  isSelected = false,
  isRestoring = false,
  isDeleting = false,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
}: Readonly<TrashedOvaCardProps>) {
  return (
    <OvaCardShell
      ova={ova}
      isSelected={isSelected}
      dateLabel="Eliminado el"
      dateValue={formatDate(ova.deleted_at)}
      dateClassName="text-red-400 font-medium"
      onToggleSelect={onToggleSelect}
    >
      <div className="flex w-full items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/5"
          disabled={isRestoring || isDeleting}
          onClick={() => onRestore?.(ova.id)}
        >
          {isRestoring ? "Restaurando..." : "Restaurar"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
          disabled={isRestoring || isDeleting}
          onClick={() => onPermanentDelete?.(ova)}
        >
          {isDeleting ? "Eliminando..." : "Borrar definitivamente"}
        </Button>
      </div>
    </OvaCardShell>
  );
}
