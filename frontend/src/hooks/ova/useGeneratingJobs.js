import { useCallback, useEffect, useRef, useState } from 'react'
import { getJobByOvaId, resumeJob } from '../../services/ovaCreationService.js'

const POLL_MS = 4000
const TERMINAL = new Set(['done', 'error', 'interrupted'])

function computeProgress(job) {
  if (!job?.resources?.length) return null
  const total = job.resources.length
  const done = job.resources.filter((r) => r.status === 'done').length
  return { done, total }
}

/**
 * HU-023 — single-timer poller for every "generando" OVA in a list.
 *
 * Replaces per-card useJobByOva (one timer + one network burst per card) with
 * a single shared loop (Vercel: client-swr-dedup). Each tick fetches the latest
 * job per generating ova in parallel and publishes a `{ ovaId -> jobState }` map,
 * so OvaCard can be a pure (memoized) reader instead of owning a poll.
 */
export function useGeneratingJobs(ovas) {
  const [jobs, setJobs] = useState({})

  const idsKey = ovas
    .filter((o) => o.status === 'generando')
    .map((o) => o.id)
    .join(',')

  const idsRef = useRef([])
  const jobsRef = useRef({})
  const timerRef = useRef(null)
  const pollRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    jobsRef.current = jobs
  }, [jobs])

  const tick = useCallback(async () => {
    const ids = idsRef.current
    if (!ids.length || !mountedRef.current) return
    const entries = await Promise.all(
      ids.map(async (ovaId) => {
        try {
          return [ovaId, await getJobByOvaId(ovaId)]
        } catch {
          return [ovaId, null]
        }
      })
    )
    if (!mountedRef.current) return
    setJobs((prev) => {
      const next = { ...prev }
      for (const [ovaId, data] of entries) {
        if (!data) continue
        next[ovaId] = {
          jobId: data.job_id ?? null,
          status: data.status ?? null,
          progress: computeProgress(data),
          isInterrupted: data.status === 'interrupted',
        }
      }
      return next
    })
    // Keep polling while at least one tracked job is still running.
    const stillRunning = entries.some(([, d]) => d && !TERMINAL.has(d.status))
    if (mountedRef.current && stillRunning) {
      timerRef.current = setTimeout(() => pollRef.current?.(), POLL_MS)
    }
  }, [])

  useEffect(() => {
    pollRef.current = tick
  }, [tick])

  useEffect(() => {
    mountedRef.current = true
    idsRef.current = idsKey ? idsKey.split(',') : []
    if (idsRef.current.length) pollRef.current?.()
    return () => {
      mountedRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [idsKey])

  const resume = useCallback(async (ovaId) => {
    const job = jobsRef.current[ovaId]
    if (!job?.jobId) return
    await resumeJob(job.jobId, [])
    if (mountedRef.current && !timerRef.current) pollRef.current?.()
  }, [])

  return { jobs, resume }
}
