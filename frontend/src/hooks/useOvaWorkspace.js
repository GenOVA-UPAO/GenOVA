import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchOvaEditorData, downloadEditedScorm, triggerRegen, pollRegenProgress, reorderPhases, deletePhase, savePhaseContent, revertToVersion, fetchVersionDiff, addPhase } from '../services/ovaEditService.js'
import { useOvaUploads } from './useOvaUploads.js'

const POLL_MS = 3000

/**
 * HU-025 — workspace orchestration hook.
 * Loads OVA data, manages regen polling, upload state, and panel view toggle.
 * Uses ref-based poll to avoid TDZ and follows the pollRef pattern.
 */
export function useOvaWorkspace(ovaId) {
  const [ova, setOva] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhaseIds, setSelectedPhaseIds] = useState([])

  const regenTimerRef = useRef(null)
  const pollRegenRef = useRef(null)
  const mountedRef = useRef(true)
  const uploads = useOvaUploads()

  const load = useCallback(async () => {
    if (!ovaId) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchOvaEditorData(ovaId)
      if (mountedRef.current) setOva(data)
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'No se pudo cargar el OVA.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [ovaId])

  // Poll for regen progress using the ref to avoid TDZ.
  const pollRegen = useCallback(
    async (jobId) => {
      if (!mountedRef.current) return
      try {
        const progress = await pollRegenProgress(ovaId, jobId)
        if (!mountedRef.current) return
        if (progress.status === 'done' || progress.status === 'error') {
          setIsRegenerating(false)
          void load()
          if (progress.status === 'done') toast.success('OVA regenerado.')
          else toast.error('La regeneración falló.')
        } else {
          regenTimerRef.current = setTimeout(() => pollRegenRef.current?.(jobId), POLL_MS)
        }
      } catch {
        if (mountedRef.current) {
          setIsRegenerating(false)
          toast.error('Error al consultar el progreso de regeneración.')
        }
      }
    },
    [ovaId, load]
  )

  useEffect(() => {
    pollRegenRef.current = pollRegen
  }, [pollRegen])

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await load()
    })()
    return () => {
      cancelled = true
      mountedRef.current = false
      if (regenTimerRef.current) clearTimeout(regenTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ovaId])

  // HU-027: toggle resource selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((m) => !m)
    setSelectedPhaseIds([])
  }, [])

  const togglePhaseSelection = useCallback((phaseId) => {
    setSelectedPhaseIds((ids) =>
      ids.includes(phaseId) ? ids.filter((id) => id !== phaseId) : [...ids, phaseId]
    )
  }, [])

  const submitPrompt = useCallback(async () => {
    if (!prompt.trim() || isRegenerating) return
    setIsRegenerating(true)
    try {
      const faseIds = selectionMode && selectedPhaseIds.length > 0 ? selectedPhaseIds : []
      const { job_id } = await triggerRegen(ovaId, { prompt: prompt.trim(), faseIds })
      setPrompt('')
      regenTimerRef.current = setTimeout(() => pollRegenRef.current?.(job_id), POLL_MS)
    } catch (err) {
      setIsRegenerating(false)
      toast.error(err?.message || 'No se pudo iniciar la regeneración.')
    }
  }, [prompt, isRegenerating, ovaId, selectionMode, selectedPhaseIds])

  const downloadScorm = useCallback(async () => {
    try {
      await downloadEditedScorm(ovaId)
    } catch (err) {
      toast.error(err?.message || 'No se pudo descargar el SCORM.')
    }
  }, [ovaId])

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
  const regenPhase = useCallback(async (phaseId, prompt) => {
    setIsRegenerating(true)
    try {
      const { job_id } = await triggerRegen(ovaId, { prompt: prompt || null, faseIds: [phaseId] })
      regenTimerRef.current = setTimeout(() => pollRegenRef.current?.(job_id), POLL_MS)
    } catch (err) {
      setIsRegenerating(false)
      toast.error(err?.message || 'No se pudo iniciar la regeneración.')
    }
  }, [ovaId])

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

  const phases = useMemo(() => ova?.current_version?.phases ?? [], [ova])
  const versionNumber = ova?.current_version?.version_number ?? null
  const isReady = ova?.status === 'listo'

  return {
    ova, phases, loading, error, isReady,
    versionNumber,
    prompt, setPrompt,
    isRegenerating,
    submitPrompt, downloadScorm, load,
    uploads,
    reorderWithinPhase,
    deleteOvaPhase, savePhase, regenPhase,
    revertVersion, getDiff,
    versionHistory: ova?.version_history ?? [],
    selectionMode, selectedPhaseIds,
    toggleSelectionMode, togglePhaseSelection,
    addOvaPhase,
  }
}
