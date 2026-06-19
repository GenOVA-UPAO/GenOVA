import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchOvaEditorData, downloadEditedScorm, triggerRegen, pollRegenProgress } from '../../services/ovaEditService.js'
import { useOvaUploads } from './useOvaUploads.js'
import { useOvaPhaseActions } from './useOvaPhaseActions.js'

const POLL_MS = 3000

/**
 * HU-025 — workspace orchestration hook.
 * Loads OVA data, manages regen polling, upload state, and panel view toggle.
 * Uses ref-based poll to avoid TDZ and follows the pollRef pattern.
 */
export function useOvaWorkspace(ovaId) {
  const [ova, setOva] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenProgress, setRegenProgress] = useState({ percentage: 0, stage: '' })
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhaseIds, setSelectedPhaseIds] = useState([])

  const regenTimerRef = useRef(null)
  const pollRegenRef = useRef(null)
  const loadRef = useRef(null)
  const loadRetryRef = useRef(null)
  const mountedRef = useRef(true)
  const uploads = useOvaUploads()

  const load = useCallback(async () => {
    if (!ovaId) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchOvaEditorData(ovaId)
      if (!mountedRef.current) return
      setOva(data)
      setGenerating(false)
    } catch (err) {
      if (!mountedRef.current) return
      // OVA still finishing generation (e.g. right after the create handoff):
      // don't show a dead error — poll until it flips to "listo".
      if (err?.status === 409 || err?.code === 'ova_generating') {
        setGenerating(true)
        loadRetryRef.current = setTimeout(() => loadRef.current?.(), 3000)
      } else {
        setError(err?.message || 'No se pudo cargar el OVA.')
      }
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
        setRegenProgress({ percentage: progress.percentage ?? 0, stage: progress.stage ?? '' })
        // Backend reports terminal state as 'success' / 'error' (not 'done').
        if (progress.status === 'success' || progress.status === 'error') {
          setIsRegenerating(false)
          void load()
          if (progress.status === 'success') toast.success('OVA regenerado.')
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
    loadRef.current = load
  }, [pollRegen, load])

  // Shared regen kickoff: reset progress, fire request, start polling.
  const runRegen = useCallback(async (body) => {
    setIsRegenerating(true)
    setRegenProgress({ percentage: 0, stage: '' })
    try {
      const { job_id } = await triggerRegen(ovaId, body)
      regenTimerRef.current = setTimeout(() => pollRegenRef.current?.(job_id), POLL_MS)
      return true
    } catch (err) {
      setIsRegenerating(false)
      toast.error(err?.message || 'No se pudo iniciar la regeneración.')
      return false
    }
  }, [ovaId])

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
      if (loadRetryRef.current) clearTimeout(loadRetryRef.current)
    }
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
    const faseIds = selectionMode && selectedPhaseIds.length > 0 ? selectedPhaseIds : []
    if (await runRegen({ prompt: prompt.trim(), faseIds })) setPrompt('')
  }, [prompt, isRegenerating, selectionMode, selectedPhaseIds, runRegen])

  const downloadScorm = useCallback(async () => {
    try {
      await downloadEditedScorm(ovaId)
    } catch (err) {
      toast.error(err?.message || 'No se pudo descargar el SCORM.')
    }
  }, [ovaId])

  const phaseActions = useOvaPhaseActions({ ovaId, load, runRegen, isRegenerating, ova, setOva })

  const phases = useMemo(() => ova?.current_version?.phases ?? [], [ova])
  const versionNumber = ova?.current_version?.version_number ?? null
  const isReady = ova?.status === 'listo'

  // HU-027: select/deselect every phase at once
  const toggleSelectAll = useCallback(() => {
    setSelectedPhaseIds((ids) =>
      ids.length === phases.length ? [] : phases.map((p) => p.id)
    )
  }, [phases])

  return {
    ova, phases, loading, generating, error, isReady,
    versionNumber,
    prompt, setPrompt,
    isRegenerating, regenProgress,
    submitPrompt, downloadScorm, load,
    uploads,
    ...phaseActions,
    versionHistory: ova?.version_history ?? [],
    selectionMode, selectedPhaseIds,
    toggleSelectionMode, togglePhaseSelection, toggleSelectAll,
  }
}
