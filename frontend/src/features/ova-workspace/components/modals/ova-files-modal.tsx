import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Alert, AlertDescription } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import type { useOvaUploads } from "../../hooks/use-uploads";
import { FileChips } from "../shared/file-chips";
import { ModalActions } from "../shared/modal-actions";
import { WorkspaceModal } from "../shared/workspace-modal";
import { OvaFilesDropzone } from "./ova-files-dropzone";
import { OvaFilesEmpty } from "./ova-files-empty";

export default function OvaFilesModal({
  uploads,
  onClose,
}: Readonly<{ uploads: ReturnType<typeof useOvaUploads>; onClose: () => void }>) {
  const { t } = useTranslation();
  const files = uploads.data;
  const full = files.length >= uploads.maxUploadFiles;
  return (
    <WorkspaceModal
      title={t("workspace:archivos_de_referencia")}
      description={t("workspace:la_ia_usara_estos_archivos_como_contexto_al_g_d6d9d2")}
      size="sm"
      onClose={onClose}
      footer={
        <ModalActions>
          <Button onClick={onClose}>{t("workspace:listo")}</Button>
        </ModalActions>
      }
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
          {t("workspace:subiendo_archivos")} </div>
      )}
      {uploads.uploadError && (
        <Alert variant="destructive">
          <Icon name="warning-circle" />
          <AlertDescription>{uploads.uploadError}</AlertDescription>
        </Alert>
      )}
      {files.length === 0 ? (
        <OvaFilesEmpty />
      ) : (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{t("workspace:archivos_adjuntos")}</h3>
            <p
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                full && "font-medium text-foreground",
              )}
            >
              {files.length} {t("workspace:de")} {uploads.maxUploadFiles}
            </p>
          </div>
          <FileChips files={files} onRemove={uploads.removeUpload} />
        </section>
      )}
    </WorkspaceModal>
  );
}
