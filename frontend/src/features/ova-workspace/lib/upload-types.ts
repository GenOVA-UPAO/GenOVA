export interface RagStatus {
  /** processing · indexed · skipped · failed · error · disabled */
  status?: string;
  chunks?: number;
  /** Motivo legible (fallo de ingesta o documento truncado). */
  message?: string;
  /** Código técnico del motivo. */
  reason?: string;
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
