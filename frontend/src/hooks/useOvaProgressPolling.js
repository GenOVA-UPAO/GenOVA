import { useEffect } from 'react'
import { fetchOvaProgress } from '../services/ovaGenerationService.js'

const PROGRESS_POLL_INTERVAL_MS = Number(import.meta.env.VITE_OVA_PROGRESS_POLL_MS || 1200)

export function useOvaProgressPolling({
  isGenerating,
  jobId,
  setIsGenerating,
  setProgress,
  setStatusMessage,
}) {
  useEffect(() => {
    if (!isGenerating || !jobId) {
      return undefined
    }

    let isCancelled = false
    let timerId = null

    async function pollProgress() {
      try {
        const data = await fetchOvaProgress(jobId)
        if (isCancelled) return

        const nextProgress = {
          percentage: Number(data?.percentage || 0),
          stage: data?.stage || 'Procesando...',
          status: data?.status || 'running',
        }

        setProgress(nextProgress)

        if (nextProgress.status === 'success') {
          setIsGenerating(false)
          setStatusMessage(data?.message || 'OVA generado correctamente.')
          return
        }

        if (nextProgress.status === 'error') {
          setIsGenerating(false)
          setStatusMessage(data?.message || 'Ocurrió un error durante la generación.')
          return
        }

        timerId = window.setTimeout(pollProgress, PROGRESS_POLL_INTERVAL_MS)
      } catch {
        if (isCancelled) return
        setIsGenerating(false)
        setStatusMessage('No se pudo obtener el progreso de generación.')
      }
    }

    pollProgress()

    return () => {
      isCancelled = true
      if (timerId) {
        window.clearTimeout(timerId)
      }
    }
  }, [isGenerating, jobId, setIsGenerating, setProgress, setStatusMessage])
}
