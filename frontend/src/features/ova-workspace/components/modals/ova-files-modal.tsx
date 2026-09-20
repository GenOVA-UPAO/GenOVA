import type { useOvaUploads } from "../../hooks/use-uploads";
import { FileChips } from "../shared/file-chips";
import { WorkspaceModal } from "../shared/workspace-modal";

export default function OvaFilesModal({ uploads, onClose }: Readonly<{ uploads: ReturnType<typeof useOvaUploads>; onClose: () => void }>) {
  return (
    <WorkspaceModal title="Archivos de referencia" onClose={onClose}>
      <p>Hasta {uploads.maxUploadFiles} archivos de referencia.</p>
      <label htmlFor="reference-files">Subir archivos</label>
      <input
        id="reference-files"
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
        disabled={uploads.uploading}
        onChange={(event) => {
          if (event.target.files) {
            void uploads.addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />
      <FileChips files={uploads.data ?? []} onRemove={uploads.removeUpload} />
      {uploads.uploading && <p role="status">Subiendo archivos…</p>}
      {uploads.uploadError && <p role="alert">{uploads.uploadError}</p>}
    </WorkspaceModal>
  );
}
