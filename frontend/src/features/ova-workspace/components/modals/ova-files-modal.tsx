import { Icon } from "@/core/components/icon";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { cn } from "@/core/lib/cn";

import type { useOvaUploads } from "../../hooks/use-uploads";
import { FileChips } from "../shared/file-chips";
import { WorkspaceModal } from "../shared/workspace-modal";
import { OvaFilesDropzone } from "./ova-files-dropzone";
import { OvaFilesEmpty } from "./ova-files-empty";

export default function OvaFilesModal({ uploads, onClose }: Readonly<{ uploads: ReturnType<typeof useOvaUploads>; onClose: () => void }>) {
  const files = uploads.data ?? [];
  const full = files.length >= uploads.maxUploadFiles;
  return (
    <WorkspaceModal
      title="Archivos de referencia"
      description={`Hasta ${String(uploads.maxUploadFiles)} archivos de referencia.`}
      size="sm"
      onClose={onClose}
    >
      <OvaFilesDropzone
        count={files.length}
        max={uploads.maxUploadFiles}
        uploading={uploads.uploading}
        onFiles={(selected) => {
          void uploads.addFiles(selected);
        }}
      />
      {uploads.uploading && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          <Icon name="spinner" className="animate-spin" />
          Subiendo archivos…
        </div>
      )}
      {uploads.uploadError && (
        <Alert variant="destructive">
          <Icon name="warning-circle" />
          <AlertDescription>{uploads.uploadError}</AlertDescription>
        </Alert>
      )}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Archivos adjuntos</p>
          <p className={cn("text-xs font-semibold tabular-nums", full && "text-primary")}>
            {files.length} de {uploads.maxUploadFiles}
          </p>
        </div>
        {files.length === 0 ? <OvaFilesEmpty /> : <FileChips files={files} onRemove={uploads.removeUpload} />}
      </section>
    </WorkspaceModal>
  );
}
