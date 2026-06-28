// Configuración de las 5 fases 5E + helpers de selección del PhaseSelectModal.
// Extraído del modal para mantener archivos ≤200 líneas.
import {
  CheckCircle,
  Hammer,
  Lightbulb,
  MagnifyingGlass,
  Target,
} from '@phosphor-icons/react'
import {
  fetchPhaseRecursos,
  type Phase,
} from '@/features/ova_workspace/services/phases/phaseService'
import type { Resource } from '@/features/student/lib/types'

export interface PhaseCfg {
  key: string
  Icon: typeof Target
  label: string
  sub: string
  color: string
  fetch: () => Promise<unknown>
  bg: string
}

export interface Picks {
  [phaseKey: string]: Resource[]
}

export interface ResourceConfigs {
  [key: string]: Record<string, number>
}

const mk = (
  key: string,
  Icon: typeof Target,
  label: string,
  sub: string,
  color: string,
): PhaseCfg => ({
  key,
  Icon,
  label,
  sub,
  color,
  fetch: () => fetchPhaseRecursos(key as Phase),
  bg: `color-mix(in oklch, ${color} 8%, transparent)` as string,
})

export const PHASE_CFG: PhaseCfg[] = [
  mk(
    'engage',
    Target,
    'ENGAGE',
    'Despierta curiosidad · activa saberes previos',
    '#EF4444',
  ),
  mk(
    'explore',
    MagnifyingGlass,
    'EXPLORE',
    'Descubre patrones · construye hipótesis',
    '#3B82F6',
  ),
  mk(
    'explain',
    Lightbulb,
    'EXPLAIN',
    'Formaliza conceptos · consolida la teoría',
    '#F59E0B',
  ),
  mk(
    'elaborate',
    Hammer,
    'ELABORATE',
    'Aplica · transfiere a problemas reales',
    '#8B5CF6',
  ),
  mk(
    'evaluate',
    CheckCircle,
    'EVALUATE',
    'Verifica aprendizajes · reflexiona el proceso',
    '#10B981',
  ),
]

export const MAX_PER_PHASE = 4

export const EMPTY_PICKS = (): Picks =>
  Object.fromEntries(PHASE_CFG.map((p) => [p.key, []]))

export function toggleSelection(
  list: Resource[],
  resource: Resource,
): Resource[] {
  const idx = list.findIndex((r) => r.id === resource.id)
  if (idx >= 0) return list.filter((_, i) => i !== idx)
  if (list.length >= MAX_PER_PHASE) return list
  return [...list, resource]
}
