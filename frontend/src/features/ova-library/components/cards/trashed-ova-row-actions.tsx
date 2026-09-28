import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface TrashedOvaRowActionsProps {
  isRestoring: boolean;
  isDeleting: boolean;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

/** Restaurar (habitual) y eliminar definitivamente (pide confirmación) de una fila de la papelera. */
export function TrashedOvaRowActions({
  isRestoring,
  isDeleting,
  onRestore,
  onPermanentDelete,
}: Readonly<TrashedOvaRowActionsProps>) {
  const busy = isRestoring || isDeleting;

  return (
    <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:pl-8">
      <Button
        variant="outline"
        className="max-sm:h-11 max-sm:flex-1"
        loading={isRestoring}
        disabled={busy}
        onClick={onRestore}
      >
        {!isRestoring && <Icon name="arrow-counter-clockwise" size="text-base" />}
        {isRestoring ? "Restaurando..." : "Restaurar"}
      </Button>
      <Button
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive max-sm:h-11 max-sm:flex-1"
        disabled={busy}
        aria-label="Eliminar definitivamente"
        onClick={onPermanentDelete}
      >
        <Icon name="trash" size="text-base" />
        Eliminar
      </Button>
    </div>
  );
}
