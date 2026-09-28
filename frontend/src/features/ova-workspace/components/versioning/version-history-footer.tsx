import { Button } from "@/core/components/ui/button";

import { ModalActions } from "../shared/modal-actions";

function compareStatus(count: number, compared: boolean): string {
  if (compared)
    return "Los cambios están debajo de la lista. Desmarca una versión para elegir otra.";
  if (count === 2) return "2 versiones marcadas. Desmarca una para elegir otra.";
  return `Marca 2 versiones para compararlas (${String(count)} de 2).`;
}

interface Props {
  canCompare: boolean;
  selectedCount: number;
  comparing: boolean;
  /** Ya se muestra la comparación de las dos marcadas: volver a pedirla no aporta nada. */
  compared: boolean;
  onCompare: () => void;
  onClose: () => void;
}

export function VersionHistoryFooter({
  canCompare,
  selectedCount,
  comparing,
  compared,
  onCompare,
  onClose,
}: Readonly<Props>) {
  return (
    <ModalActions status={canCompare && compareStatus(selectedCount, compared)}>
      <Button variant="outline" onClick={onClose}>
        Cerrar
      </Button>
      {canCompare && !compared && (
        <Button disabled={selectedCount !== 2} loading={comparing} onClick={onCompare}>
          Comparar versiones
        </Button>
      )}
    </ModalActions>
  );
}
