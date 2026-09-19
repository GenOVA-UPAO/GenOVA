export interface RagStatus {
  status?: string;
  chunks?: number;
  message?: string;
}

export interface UploadItem {
  clientId: string;
  uploadId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: "uploading" | "success" | "error";
  message: string;
  ragStatus?: RagStatus | null;
}

export interface UploadsProps {
  uploads: UploadItem[];
  activeUploadsCount: number;
  maxUploadFiles: number;
  isUploadingFiles?: boolean;
  uploadError: string;
  disabled?: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (clientId: string) => void;
}
