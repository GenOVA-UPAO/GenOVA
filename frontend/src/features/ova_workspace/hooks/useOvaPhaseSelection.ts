import { useCallback, useState } from 'react'
import type { PhaseWithContent } from '../lib/types'

/**
 * Estado y acciones del modo "selección múltiple" de fases en el editor de OVA
 * (selección por checkbox para regenerar varias a la vez). Extraído de
 * useOvaWorkspace para mantener archivos ≤200 líneas.
 */
export function useOvaPhaseSelection(phases: PhaseWithContent[]) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>([])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((m) => !m)
    setSelectedPhaseIds([])
  }, [])

  const togglePhaseSelection = useCallback((phaseId: string) => {
    setSelectedPhaseIds((ids) =>
      ids.includes(phaseId)
        ? ids.filter((id) => id !== phaseId)
        : [...ids, phaseId],
    )
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedPhaseIds((ids) =>
      ids.length === phases.length ? [] : phases.map((p) => p.id),
    )
  }, [phases])

  return {
    selectionMode,
    selectedPhaseIds,
    toggleSelectionMode,
    togglePhaseSelection,
    toggleSelectAll,
  }
}
