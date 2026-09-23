import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface PapeleraBulkActionsProps {
  disabled: boolean;
  onRestore: () => void;
  onDelete: () => void;
}

/** Acciones masivas de la papelera sobre los OVAs seleccionados. */
export function PapeleraBulkActions({ disabled, onRestore, onDelete }: Readonly<PapeleraBulkActionsProps>) {
  return (
    <>
      <Button variant="outline" onClick={onRestore} disabled={disabled}>
        <Icon name="arrow-counter-clockwise" size="text-base" />
        Restaurar
      </Button>
      <Button variant="destructive" onClick={onDelete} disabled={disabled}>
        <Icon name="trash" size="text-base" />
        Eliminar definitivamente
      </Button>
    </>
  );
}
