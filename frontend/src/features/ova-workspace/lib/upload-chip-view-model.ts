import type { UploadsPropBag } from "../components/editor/workspace-chat-panel.types";
import type { UploadsProps } from "./uploadTypes";

export const UPLOAD_MAX_FILES = 5;

export function validateFileAdd(
  existingCount: number,
  incomingCount: number,
  max = UPLOAD_MAX_FILES,
): string | null {
  if (existingCount + incomingCount > max) {
    return `Solo se permiten hasta ${max} archivos en total.`;
  }
  return null;
}

export interface UploadsServiceLike {
  uploads: () => readonly import("./uploadTypes").UploadItem[];
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
