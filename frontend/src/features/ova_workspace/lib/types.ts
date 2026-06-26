// Tipos del dominio "workspace" (creación/edición de un OVA).

export interface Phase {
  id: string
  [key: string]: unknown
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
