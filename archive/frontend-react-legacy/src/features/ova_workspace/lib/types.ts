// Tipos del dominio "workspace" (creación/edición de un OVA).

export interface Phase {
  id: string
  [key: string]: unknown
}

/**
 * Fase de un OVA ya generada (con su contenido HTML). Las fases del backend
 * siempre traen `phase_type`; `content`/`title` están presentes tras generar.
 * Tipo compartido por el editor (panel, preview, item, lista de recursos).
 */
export interface PhaseWithContent extends Phase {
  phase_type: string
  content?: string
  title?: string
  regenerated?: boolean
}

export interface OvaData {
  status?: string
  current_version?: {
    version_number?: number
    phases?: Phase[]
    [key: string]: unknown
  }
  version_history?: unknown[]
  [key: string]: unknown
}

export interface ResourcePick {
  id: string
  [key: string]: unknown
}

export type Selections = Record<string, ResourcePick[]>

export interface OvaTheme {
  color: string
  design: string
}
