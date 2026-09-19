import type { MetadataInput } from "../lib/metadata-schema";
import type { OvaListItem } from "../lib/types";
import { BulkTrashModal } from "./modals/bulk-trash-modal";
import { EditMetadataModal } from "./modals/edit-metadata-modal";
import { TrashModal } from "./modals/trash-modal";

interface MisOvasModalsProps {
  ovaToTrash: OvaListItem | null;
  movingId: string | null;
  showBulkModal: boolean;
  selectedCount: number;
  bulkLoading: boolean;
  editingOva: OvaListItem | null;
  metadataSaving: boolean;
  onCloseTrash: () => void;
  onConfirmTrash: () => void;
  onCloseBulkTrash: () => void;
  onConfirmBulkTrash: () => void;
  onCloseEditMetadata: () => void;
  onSaveMetadata: (meta: MetadataInput) => void;
}

/** Agrupa los modales de la página de Mis OVAs (papelera individual, masiva y edición de metadatos). */
export function MisOvasModals({
  ovaToTrash,
  movingId,
  showBulkModal,
  selectedCount,
  bulkLoading,
  editingOva,
  metadataSaving,
  onCloseTrash,
  onConfirmTrash,
  onCloseBulkTrash,
  onConfirmBulkTrash,
  onCloseEditMetadata,
  onSaveMetadata,
}: Readonly<MisOvasModalsProps>) {
  return (
    <>
      {ovaToTrash && (
        <TrashModal
          ova={ovaToTrash}
          isLoading={movingId === ovaToTrash.id}
          onConfirm={onConfirmTrash}
          onCancel={onCloseTrash}
        />
      )}
      {showBulkModal && (
        <BulkTrashModal
          count={selectedCount}
          isLoading={bulkLoading}
          onConfirm={onConfirmBulkTrash}
          onCancel={onCloseBulkTrash}
        />
      )}
      {editingOva && (
        <EditMetadataModal
          initial={{ title: editingOva.title ?? "", description: editingOva.description }}
          isLoading={metadataSaving}
          onSave={onSaveMetadata}
          onCancel={onCloseEditMetadata}
        />
      )}
    </>
  );
}
