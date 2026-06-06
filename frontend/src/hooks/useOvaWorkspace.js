import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchOvaEditorData, downloadEditedScorm, triggerRegen, pollRegenProgress } from '../services/ovaEditService.js'
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

  const submitPrompt = useCallback(async () => {
    if (!prompt.trim() || isRegenerating) return
    setIsRegenerating(true)
    try {
      const { job_id } = await triggerRegen(ovaId, { prompt: prompt.trim() })
      setPrompt('')
      regenTimerRef.current = setTimeout(() => pollRegenRef.current?.(job_id), POLL_MS)
    } catch (err) {
      setIsRegenerating(false)
      toast.error(err?.message || 'No se pudo iniciar la regeneración.')
    }
  }, [prompt, isRegenerating, ovaId])

  const downloadScorm = useCallback(async () => {
    try {
      await downloadEditedScorm(ovaId)
    } catch (err) {
      toast.error(err?.message || 'No se pudo descargar el SCORM.')
    }
  }, [ovaId])

  const phases = ova?.current_version?.phases ?? []
  const versionNumber = ova?.current_version?.version_number ?? null
  const isReady = ova?.status === 'listo'

  return {
    ova, phases, loading, error, isReady,
    versionNumber,
    prompt, setPrompt,
    isRegenerating,
    submitPrompt, downloadScorm, load,
    uploads,
  }
}
