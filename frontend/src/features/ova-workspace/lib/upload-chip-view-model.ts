import i18n from "i18next";

import type { UploadsPropBag } from "../components/editor/workspace-chat-panel.types";
import type { UploadItem, UploadsProps } from "./upload-types";

export const UPLOAD_MAX_FILES = 5;

export function validateFileAdd(
  existingCount: number,
  incomingCount: number,
  max = UPLOAD_MAX_FILES,
): string | null {
  if (existingCount + incomingCount > max) {
    return i18n.t("workspace:solo_se_permiten_hasta_value_archivos_en_total", { p0: String(max) });
  }
  return null;
}

export interface UploadsServiceLike {
  uploads: () => readonly UploadItem[];
  activeUploadsCount: () => number;
  maxUploadFiles: number;
  isUploadingFiles: () => boolean;
  uploadError: () => string;
  handleFilesSelected: (files: FileList | File[]) => void | Promise<void>;
  handleRemoveUpload: (clientId: string) => void | Promise<void>;
}

export function buildUploadsProps(svc: UploadsServiceLike, disabled = false): UploadsProps {
  return {
    uploads: [...svc.uploads()],
    activeUploadsCount: svc.activeUploadsCount(),
    maxUploadFiles: svc.maxUploadFiles,
    isUploadingFiles: svc.isUploadingFiles(),
    uploadError: svc.uploadError(),
    disabled,
    onFilesSelected: (files) => void svc.handleFilesSelected(files),
    onRemove: (id) => void svc.handleRemoveUpload(id),
  };
}

export function buildUploadsPropBag(svc: UploadsServiceLike, disabled = false): UploadsPropBag {
  return {
    uploads: [...svc.uploads()],
    activeUploadsCount: svc.activeUploadsCount(),
    maxUploadFiles: svc.maxUploadFiles,
    isUploadingFiles: svc.isUploadingFiles(),
    uploadError: svc.uploadError(),
    disabled,
  };
}
