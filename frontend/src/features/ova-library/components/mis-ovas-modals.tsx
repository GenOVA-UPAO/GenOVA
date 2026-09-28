import type { useMisOvasPage } from "../hooks/use-mis-ovas-page";
import { focusCardMenu } from "../lib/focus-card-menu";
import { BulkTrashModal } from "./modals/bulk-trash-modal";
import { EditMetadataModal } from "./modals/edit-metadata-modal";
import { TrashModal } from "./modals/trash-modal";

interface MisOvasModalsProps {
  page: ReturnType<typeof useMisOvasPage>;
}

/** Modales de Mis OVAs: mover a la papelera (uno o varios) y editar título y descripción. */
export function MisOvasModals({ page: p }: Readonly<MisOvasModalsProps>) {
  const { ovaToTrash, editingOva, actions } = p;

  return (
    <>
      {ovaToTrash && (
        <TrashModal
          ova={ovaToTrash}
          isLoading={actions.movingId === ovaToTrash.id}
          onConfirm={() => { void p.handleConfirmTrash(); }}
          onCancel={() => { p.setOvaToTrash(null); }}
          onCloseAutoFocus={focusCardMenu(ovaToTrash.id)}
        />
      )}
      {p.showBulkModal && (
        <BulkTrashModal
          count={p.selection.selectedIds.size}
          isLoading={actions.bulkLoading}
          onConfirm={() => { void p.handleConfirmBulkTrash(); }}
          onCancel={() => { p.setShowBulkModal(false); }}
        />
      )}
      {editingOva && (
        <EditMetadataModal
          initial={{ title: editingOva.title ?? "", description: editingOva.description }}
          isLoading={actions.metadataSaving}
          onSave={p.handleSaveMetadata}
          onCancel={() => { p.setEditingOva(null); }}
          onCloseAutoFocus={focusCardMenu(editingOva.id)}
        />
      )}
    </>
  );
}
