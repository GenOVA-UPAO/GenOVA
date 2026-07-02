// Helpers compartidos para los esquemas de configuración por recurso.
export interface ConfigField {
  key: string
  label: string
  type: 'number'
  min: number
  max: number
  default: number
  requiresVideo?: boolean
  description: string
}

export const N = (
  key: string,
  label: string,
  min: number,
  max: number,
  def: number,
  desc = '',
): ConfigField => ({
  key,
  label,
  type: 'number',
  min,
  max,
  default: def,
  description: desc,
})
export const V = (
  key: string,
  label: string,
  min: number,
  max: number,
  def: number,
  desc = '',
): ConfigField => ({
  key,
  label,
  type: 'number',
  min,
  max,
  default: def,
  requiresVideo: true,
  description: desc,
})

