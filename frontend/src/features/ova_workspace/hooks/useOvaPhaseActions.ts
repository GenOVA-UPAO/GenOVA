import { type Dispatch, type SetStateAction, useCallback } from 'react'
import { toast } from 'sonner'
import {
  addPhase,
  deletePhase,
  fetchVersionDiff,
  reorderPhases,
  revertToVersion,
  savePhaseContent,
} from '../services/ovaEditService'
import type { OvaData, Phase } from '../lib/types'

interface RegenBody {
  prompt: string | null
  faseIds: string[]
}

interface PhaseActionsOpts {
  ovaId: string
  load: () => Promise<void> | void
  runRegen: (body: RegenBody) => Promise<boolean>
  isRegenerating: boolean
  ova: OvaData | null
  setOva: Dispatch<SetStateAction<OvaData | null>>
}

/**
 * Phase action handlers extracted from useOvaWorkspace for line-count compliance.
 * Covers: delete, save, regen, add, revert, diff, and reorder.
 */
export function useOvaPhaseActions({
  ovaId,
  load,
  runRegen,
  isRegenerating,
  ova,
  setOva,
}: PhaseActionsOpts) {
  const deleteOvaPhase = useCallback(
    async (phaseId: string) => {
      try {
        await deletePhase(ovaId, phaseId)
        toast.success('Recurso eliminado.')
        void load()
      } catch (err) {
        toast.error((err as Error)?.message || 'No se pudo eliminar el recurso.')
      }
    },
    [ovaId, load],
  )

  const savePhase = useCallback(
    async (phaseId: string, content: string) => {
      try {
        await savePhaseContent(ovaId, phaseId, content)
        toast.success('Recurso actualizado.')
        void load()
      } catch (err) {
        toast.error((err as Error)?.message || 'No se pudo guardar.')
      }
    },
    [ovaId, load],
  )

  const regenPhase = useCallback(
    (phaseId: string, prompt?: string) => runRegen({ prompt: prompt || null, faseIds: [phaseId] }),
    [runRegen],
  )

  const regenAll = useCallback(() => {
    if (!isRegenerating) runRegen({ prompt: null, faseIds: [] })
  }, [isRegenerating, runRegen])

  const addOvaPhase = useCallback(
    async (phaseType: string, prompt: string) => {
      try {
        await addPhase(ovaId, phaseType, prompt)
        toast.success('Recurso añadido.')
        void load()
      } catch (err) {
        toast.error((err as Error)?.message || 'No se pudo añadir el recurso.')
      }
    },
    [ovaId, load],
  )

  const revertVersion = useCallback(
    async (versionId: string) => {
      try {
        await revertToVersion(ovaId, versionId)
        toast.success('Versión restaurada.')
        void load()
      } catch (err) {
        toast.error((err as Error)?.message || 'No se pudo revertir.')
      }
    },
    [ovaId, load],
  )

  const getDiff = useCallback(
    (v1: string | number, v2: string | number) => fetchVersionDiff(ovaId, v1, v2),
    [ovaId],
  )

  const reorderWithinPhase = useCallback(
    async (updatedPhases: Phase[]) => {
      const prev = ova
      setOva((o) =>
        o ? { ...o, current_version: { ...o.current_version, phases: updatedPhases } } : o,
      )
      const reorders = updatedPhases.map((p, i) => ({ phase_id: p.id, new_order: i + 1 }))
      try {
        await reorderPhases(ovaId, reorders)
      } catch (err) {
        setOva(prev)
        toast.error((err as Error)?.message || 'No se pudo reordenar.')
      }
    },
    [ova, ovaId, setOva],
  )

  return {
    deleteOvaPhase,
    savePhase,
    regenPhase,
    regenAll,
    addOvaPhase,
    revertVersion,
    getDiff,
    reorderWithinPhase,
  }
}
