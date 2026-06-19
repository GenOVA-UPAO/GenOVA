import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  addPhase,
  deletePhase,
  fetchVersionDiff,
  reorderPhases,
  revertToVersion,
  savePhaseContent,
} from '../../services/ovaEditService.js'

/**
 * Phase action handlers extracted from useOvaWorkspace for line-count compliance.
 * Covers: delete, save, regen, add, revert, diff, and reorder.
 *
 * @param {object} opts
 * @param {string} opts.ovaId
 * @param {() => Promise<void>} opts.load
 * @param {(body: object) => Promise<boolean>} opts.runRegen
 * @param {boolean} opts.isRegenerating
 * @param {object|null} opts.ova
 * @param {(value: object|null) => void} opts.setOva
 */
export function useOvaPhaseActions({ ovaId, load, runRegen, isRegenerating, ova, setOva }) {
  // HU-026: delete a phase (creates new version without it)
  const deleteOvaPhase = useCallback(async (phaseId) => {
    try {
      await deletePhase(ovaId, phaseId)
      toast.success('Recurso eliminado.')
      void load()
    } catch (err) {
      toast.error(err?.message || 'No se pudo eliminar el recurso.')
    }
  }, [ovaId, load])

  // HU-026: save direct content edit (creates new version)
  const savePhase = useCallback(async (phaseId, content) => {
    try {
      await savePhaseContent(ovaId, phaseId, content)
      toast.success('Recurso actualizado.')
      void load()
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar.')
    }
  }, [ovaId, load])

  // HU-026/027: regen single phase with optional prompt
  const regenPhase = useCallback(
    (phaseId, prompt) => runRegen({ prompt: prompt || null, faseIds: [phaseId] }),
    [runRegen]
  )

  // Full regen from the OVA's original prompt (no specific phases).
  const regenAll = useCallback(() => {
    if (!isRegenerating) runRegen({ prompt: null, faseIds: [] })
  }, [isRegenerating, runRegen])

  // HU-032: add new resource to a phase (max 4 per phase_type)
  const addOvaPhase = useCallback(async (phaseType, prompt) => {
    try {
      await addPhase(ovaId, phaseType, prompt)
      toast.success('Recurso añadido.')
      void load()
    } catch (err) {
      toast.error(err?.message || 'No se pudo añadir el recurso.')
    }
  }, [ovaId, load])

  // HU-028: revert to a prior version
  const revertVersion = useCallback(async (versionId) => {
    try {
      await revertToVersion(ovaId, versionId)
      toast.success('Versión restaurada.')
      void load()
    } catch (err) {
      toast.error(err?.message || 'No se pudo revertir.')
    }
  }, [ovaId, load])

  // HU-028: fetch diff between two versions
  const getDiff = useCallback((v1, v2) => fetchVersionDiff(ovaId, v1, v2), [ovaId])

  // HU-033: optimistic reorder within a phase_type group
  const reorderWithinPhase = useCallback(async (updatedPhases) => {
    const prev = ova
    setOva((o) =>
      o ? { ...o, current_version: { ...o.current_version, phases: updatedPhases } } : o
    )
    const reorders = updatedPhases.map((p, i) => ({ phase_id: p.id, new_order: i + 1 }))
    try {
      await reorderPhases(ovaId, reorders)
    } catch (err) {
      setOva(prev)
      toast.error(err?.message || 'No se pudo reordenar.')
    }
  }, [ova, ovaId])

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
