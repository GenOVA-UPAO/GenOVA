// Tipos del dominio "biblioteca de OVAs" (listado de OVAs generados).

export interface OvaListItem {
  id: string
  title?: string
  description?: string
  status?: string
  [key: string]: unknown
}
