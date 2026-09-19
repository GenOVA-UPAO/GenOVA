import type { UploadItem } from "../../lib/upload-types";

export interface UploadsPropBag {
  uploads: UploadItem[];
  activeUploadsCount: number;
  maxUploadFiles: number;
  isUploadingFiles: boolean;
  uploadError: string;
  disabled?: boolean;
}

export interface RegenProgress {
  percentage: number;
  stage: string;
}
