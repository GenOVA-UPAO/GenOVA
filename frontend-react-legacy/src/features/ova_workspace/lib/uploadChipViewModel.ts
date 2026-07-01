/**
 * Pure helpers for the upload chip UI (HU-024).
 * No imports from React/browser — unit-testable in Node.
 */

export const UPLOAD_MAX_FILES = 5
export const UPLOAD_MAX_SIZE_MB = 20

export type ChipStatus = 'uploading' | 'success' | 'error'

export interface ChipEntry {
  filename: string
  sizeBytes: number
  status: ChipStatus
}

/**
 * Validate adding files before touching backend.
 * `max` por defecto es UPLOAD_MAX_FILES, pero el hook puede pasar el límite
 * configurable por env (VITE_UPLOAD_MAX_FILES). Returns an error string or null.
 */
export function validateFileAdd(
  existingCount: number,
  incomingCount: number,
  max: number = UPLOAD_MAX_FILES,
): string | null {
  if (existingCount + incomingCount > max) {
    return `Solo se permiten hasta ${max} archivos en total.`
  }
  return null
}

/**
 * Map backend/hook upload status to a human-readable chip label.
 */
export function chipStatusLabel(status: string): string {
  if (status === 'uploading') return 'subiendo'
  if (status === 'success') return 'listo'
  return 'error'
}

/**
 * Build a minimal chip object from a File (or file-like) input.
 * clientId is assigned externally by the hook.
 */
export function toChipEntry(file: { name: string; size?: number }): ChipEntry {
  return {
    filename: file.name,
    sizeBytes: file.size ?? 0,
    status: 'uploading',
  }
}
