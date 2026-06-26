import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  downloadEditedScorm,
  fetchOvaEditorData,
  pollRegenProgress,
  triggerRegen,
} from '../services/ovaEditService'
import type { OvaData } from '../lib/types'
import { useOvaPhaseActions } from './useOvaPhaseActions'
import { useOvaUploads } from './useOvaUploads'

const POLL_MS = 3000

interface RegenBody {
  prompt: string | null
  faseIds: string[]
}
interface RegenProgress {
  percentage: number
  stage: string
}

/**
 * HU-025 — workspace orchestration hook.
 * Loads OVA data, manages regen polling, upload state, and panel view toggle.
 */
export function useOvaWorkspace(ovaId: string) {
  const [ova, setOva] = useState<OvaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenProgress, setRegenProgress] = useState<RegenProgress>({ percentage: 0, stage: '' })
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>([])

  const regenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRegenRef = useRef<((jobId: string) => void) | null>(null)
  const loadRef = useRef<(() => void) | null>(null)
  const loadRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const uploads = useOvaUploads()

  const load = useCallback(async () => {
    if (!ovaId) return
    setLoading(true)
    setError('')
    try {
      const data = (await fetchOvaEditorData(ovaId)) as OvaData
      if (!mountedRef.current) return
      setOva(data)
      setGenerating(false)
    } catch (err) {
      if (!mountedRef.current) return
      const e = err as { status?: number; code?: string; message?: string }
      // OVA still finishing generation: poll until it flips to "listo".
      if (e?.status === 409 || e?.code === 'ova_generating') {
        setGenerating(true)
        loadRetryRef.current = setTimeout(() => loadRef.current?.(), 3000)
      } else {
        setError(e?.message || 'No se pudo cargar el OVA.')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [ovaId])

  const pollRegen = useCallback(
    async (jobId: string) => {
      if (!mountedRef.current) return
      try {
        const progress = (await pollRegenProgress(ovaId, jobId)) as {
          percentage?: number
          stage?: string
          status?: string
        }
        if (!mountedRef.current) return
        setRegenProgress({ percentage: progress.percentage ?? 0, stage: progress.stage ?? '' })
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
    [ovaId, load],
  )

  useEffect(() => {
    pollRegenRef.current = pollRegen
    loadRef.current = load
  }, [pollRegen, load])

  const runRegen = useCallback(
    async (body: RegenBody): Promise<boolean> => {
      setIsRegenerating(true)
      setRegenProgress({ percentage: 0, stage: '' })
      try {
        const { job_id } = (await triggerRegen(ovaId, body)) as { job_id: string }
        regenTimerRef.current = setTimeout(() => pollRegenRef.current?.(job_id), POLL_MS)
        return true
      } catch (err) {
        setIsRegenerating(false)
        toast.error((err as Error)?.message || 'No se pudo iniciar la regeneración.')
        return false
      }
    },
    [ovaId],
  )

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

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((m) => !m)
    setSelectedPhaseIds([])
  }, [])

  const togglePhaseSelection = useCallback((phaseId: string) => {
    setSelectedPhaseIds((ids) =>
      ids.includes(phaseId) ? ids.filter((id) => id !== phaseId) : [...ids, phaseId],
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
      toast.error((err as Error)?.message || 'No se pudo descargar el SCORM.')
    }
  }, [ovaId])

  const phaseActions = useOvaPhaseActions({ ovaId, load, runRegen, isRegenerating, ova, setOva })

  const phases = useMemo(() => ova?.current_version?.phases ?? [], [ova])
  const versionNumber = ova?.current_version?.version_number ?? null
  const isReady = ova?.status === 'listo'

  const toggleSelectAll = useCallback(() => {
    setSelectedPhaseIds((ids) => (ids.length === phases.length ? [] : phases.map((p) => p.id)))
  }, [phases])

  return {
    ova,
    phases,
    loading,
    generating,
    error,
    isReady,
    versionNumber,
    prompt,
    setPrompt,
    isRegenerating,
    regenProgress,
    submitPrompt,
    downloadScorm,
    load,
    uploads,
    ...phaseActions,
    versionHistory: ova?.version_history ?? [],
    selectionMode,
    selectedPhaseIds,
    toggleSelectionMode,
    togglePhaseSelection,
    toggleSelectAll,
  }
}
