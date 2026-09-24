import { Button } from "@/core/components/ui/button";

import { ModalActions } from "../shared/modal-actions";

function compareStatus(count: number): string {
  if (count === 2) return "2 versiones marcadas. Desmarca una para elegir otra.";
  return `Marca 2 versiones para compararlas (${String(count)} de 2).`;
}

interface Props {
  canCompare: boolean;
  selectedCount: number;
  comparing: boolean;
  onCompare: () => void;
  onClose: () => void;
}

export function VersionHistoryFooter({
  canCompare,
  selectedCount,
  comparing,
  onCompare,
  onClose,
}: Readonly<Props>) {
  return (
    <ModalActions status={canCompare && compareStatus(selectedCount)}>
      <Button variant="outline" onClick={onClose}>
        Cerrar
      </Button>
      {canCompare && (
        <Button disabled={selectedCount !== 2} loading={comparing} onClick={onCompare}>
          Comparar versiones
        </Button>
      )}
    </ModalActions>
  );
}
