/**
 * Tipos compartidos del flujo de subida de archivos (OVA workspace).
 * Fuente única — evita redefinir `UploadItem` en cada componente consumidor
 * (hook productor `useOvaUploads`, `FileChip` y paneles de creación/edición).
 */

export interface RagStatus {
  status?: string
  chunks?: number
  message?: string
}

export interface UploadItem {
  clientId: string
  uploadId: string
  filename: string
  contentType: string
  sizeBytes: number
  status: 'uploading' | 'success' | 'error'
  message: string
  ragStatus?: RagStatus | null
}

/**
 * Props del bloque de subida que el hook `useOvaUploads` expone y que los
 * paneles (formulario de creación, chat) consumen. `isUploadingFiles` y
 * `disabled` son opcionales porque no todos los consumidores los necesitan.
 */
export interface UploadsProps {
  uploads: UploadItem[]
  activeUploadsCount: number
  maxUploadFiles: number
  isUploadingFiles?: boolean
  uploadError: string
  disabled?: boolean
  onFilesSelected: (files: FileList | File[]) => void
  onRemove: (clientId: string) => void
}
