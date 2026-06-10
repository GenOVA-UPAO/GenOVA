import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getJobByOvaId, getJobStatus, resumeJob } from '../services/ovaCreationService.js'

const POLL_MS = 4000
const TERMINAL = new Set(['done', 'error', 'interrupted'])

/**
 * HU-023 — lightweight hook for OvaCard progress display.
 * Fetches the active job once on mount (when isActive), then polls while
 * the job is running. Pattern mirrors useOvaJob.js (pollRef trick).
 */
export function useJobByOva(ovaId, isActive) {
  const [job, setJob] = useState(null)
  const timerRef = useRef(null)
  const pollRef = useRef(null)
  const activeJobIdRef = useRef(null)
  const mountedRef = useRef(true)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(() => pollRef.current?.(), POLL_MS)
  }, [])

  // Poll the job via known job_id.
  const poll = useCallback(async () => {
    const id = activeJobIdRef.current
    if (!id || !mountedRef.current) return
    try {
      const data = await getJobStatus(id)
      if (!mountedRef.current || activeJobIdRef.current !== id) return
      setJob(data)
      if (!TERMINAL.has(data.status)) {
        schedule()
      } else {
        clearTimer()
      }
    } catch {
      if (mountedRef.current) schedule()
    }
  }, [schedule, clearTimer])

  useEffect(() => {
    pollRef.current = poll
  }, [poll])

  // Initial lookup by ova_id, then start polling if still active.
  useEffect(() => {
    if (!isActive || !ovaId) return
    mountedRef.current = true

    let cancelled = false
    ;(async () => {
      try {
        const data = await getJobByOvaId(ovaId)
        if (cancelled || !mountedRef.current) return
        activeJobIdRef.current = data.job_id
        setJob(data)
        if (!TERMINAL.has(data.status)) {
          schedule()
        }
      } catch {
        // Job not found or network error — silent, card stays in StatusBadge state.
      }
    })()

    return () => {
      cancelled = true
      mountedRef.current = false
      clearTimer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ovaId, isActive])

  useEffect(() => {
    return clearTimer
  }, [clearTimer])

  // Resume an interrupted job then start polling.
  const resume = useCallback(async () => {
    const id = activeJobIdRef.current
    if (!id) return
    await resumeJob(id, [])
    clearTimer()
    schedule()
  }, [clearTimer, schedule])

  const progress = useMemo(() => {
    if (!job?.resources?.length) return null
    const total = job.resources.length
    const done = job.resources.filter((r) => r.status === 'done').length
    return { done, total }
  }, [job])

  return {
    jobId: job?.job_id ?? null,
    jobStatus: job?.status ?? null,
    progress,
    isInterrupted: job?.status === 'interrupted',
    resume,
  }
}
