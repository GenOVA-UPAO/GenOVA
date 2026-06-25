/**
 * Pure helpers for the upload chip UI (HU-024).
 * No imports from React/browser — unit-testable in Node.
 */

export const UPLOAD_MAX_FILES = 5
export const UPLOAD_MAX_SIZE_MB = 20

/**
 * Validate adding files before touching backend.
 * Returns an error string or null.
 */
export function validateFileAdd(existingCount, incomingCount) {
  if (existingCount + incomingCount > UPLOAD_MAX_FILES) {
    return `Solo se permiten hasta ${UPLOAD_MAX_FILES} archivos en total.`
  }
  return null
}

/**
 * Map backend/hook upload status to a human-readable chip label.
 */
export function chipStatusLabel(status) {
  if (status === 'uploading') return 'subiendo'
  if (status === 'success') return 'listo'
  return 'error'
}

/**
 * Build a minimal chip object from a File (or file-like) input.
 * clientId is assigned externally by the hook.
 */
export function toChipEntry(file) {
  return {
    filename: file.name,
    sizeBytes: file.size ?? 0,
    status: 'uploading',
  }
}
