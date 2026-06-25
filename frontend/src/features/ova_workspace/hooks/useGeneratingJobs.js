import { useCallback } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { getJobByOvaId, resumeJob } from '../services/ovaCreationService.js'

const POLL_MS = 4000
const TERMINAL = new Set(['done', 'error', 'interrupted'])

function computeProgress(job) {
  if (!job?.resources?.length) return null
  const total = job.resources.length
  const done = job.resources.filter((r) => r.status === 'done').length
  return { done, total }
}

/**
 * HU-023 — estado de cada OVA "generando" vía TanStack Query.
 *
 * Una query por ova generando, con `refetchInterval` que sólo sigue sondeando
 * mientras el job no esté en estado terminal (dedup + caché compartida; Vercel:
 * client-swr-dedup). Sustituye el poller manual con setTimeout/refs.
 */
export function useGeneratingJobs(ovas) {
  const qc = useQueryClient()
  const ids = ovas.filter((o) => o.status === 'generando').map((o) => o.id)

  const results = useQueries({
    queries: ids.map((ovaId) => ({
      queryKey: ['ovaJob', ovaId],
      queryFn: async () => {
        try {
          return await getJobByOvaId(ovaId)
        } catch (err) {
          // OVA huérfana (generando sin registro ova_job): no reintentamos.
          if (err?.status === 404) return null
          throw err
        }
      },
      staleTime: 0,
      refetchInterval: (query) => {
        const status = query.state.data?.status
        return status && !TERMINAL.has(status) ? POLL_MS : false
      },
    })),
  })

  const jobs = {}
  ids.forEach((ovaId, i) => {
    const data = results[i]?.data
    if (!data) return
    jobs[ovaId] = {
      jobId: data.job_id ?? null,
      status: data.status ?? null,
      progress: computeProgress(data),
      isInterrupted: data.status === 'interrupted',
    }
  })

  const resume = useCallback(
    async (ovaId) => {
      const data = qc.getQueryData(['ovaJob', ovaId])
      if (!data?.job_id) return
      await resumeJob(data.job_id, [])
      qc.invalidateQueries({ queryKey: ['ovaJob', ovaId] })
    },
    [qc],
  )

  return { jobs, resume }
}
