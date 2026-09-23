import { Checkbox } from "@/core/components/ui/checkbox";
import { cn } from "@/core/lib/cn";

import { formatShortDate, ownerNameOf } from "../../lib/ova-card-format";
import type { OvaListItem } from "../../lib/types";
import { OvaCardMeta } from "./ova-card-meta";
import { TrashedOvaRowActions } from "./trashed-ova-row-actions";

interface TrashedOvaRowProps {
  ova: OvaListItem;
  isSelected?: boolean;
  isRestoring?: boolean;
  isDeleting?: boolean;
  onToggleSelect?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (ova: OvaListItem) => void;
}

/** Fila de la papelera: restaurar (acción habitual) o eliminar definitivamente. */
export function TrashedOvaRow({
  ova,
  isSelected = false,
  isRestoring = false,
  isDeleting = false,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
}: Readonly<TrashedOvaRowProps>) {
  const title = ova.title?.trim() ? ova.title : "Sin título";

  return (
    <li
      data-testid="ova-card"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors",
        isSelected && "bg-primary/5",
        (isRestoring || isDeleting) && "opacity-60",
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect?.(ova.id)}
        aria-label={`Seleccionar ${title}`}
      />
      <div className="min-w-0 flex-1 basis-48 space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground" title={title}>
          {title}
        </h3>
        <OvaCardMeta
          ownerName={ownerNameOf(ova)}
          dateTime={ova.deleted_at}
          dateText={formatShortDate(ova.deleted_at)}
          datePrefix="Eliminado el"
        />
      </div>
      <TrashedOvaRowActions
        isRestoring={isRestoring}
        isDeleting={isDeleting}
        onRestore={() => onRestore?.(ova.id)}
        onPermanentDelete={() => onPermanentDelete?.(ova)}
      />
    </li>
  );
}
