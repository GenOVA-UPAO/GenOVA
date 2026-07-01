import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  getJobByOvaId,
  resumeJob,
} from '../../ova_workspace/services/ovaCreationService'
import type { JobInfo } from '../components/cards/OvaCard'
import type { OvaListItem } from '../lib/types'

const POLL_MS = 4000
const TERMINAL = new Set(['done', 'error', 'interrupted'])

interface JobData {
  job_id?: string
  status?: string
  resources?: { status: string }[]
}

function computeProgress(
  job: JobData | null,
): { done: number; total: number } | null {
  if (!job?.resources?.length) return null
  const total = job.resources.length
  const done = job.resources.filter((r) => r.status === 'done').length
  return { done, total }
}

/**
 * HU-023 — estado de cada OVA "generando" vía TanStack Query.
 *
 * Una query por ova generando, con `refetchInterval` que sólo sigue sondeando
 * mientras el job no esté en estado terminal (dedup + caché compartida).
 */
export function useGeneratingJobs(ovas: OvaListItem[]) {
  const qc = useQueryClient()
  const ids = ovas.filter((o) => o.status === 'generando').map((o) => o.id)

  const results = useQueries({
    queries: ids.map((ovaId) => ({
      queryKey: ['ovaJob', ovaId],
      queryFn: async (): Promise<JobData | null> => {
        try {
          return (await getJobByOvaId(ovaId)) as JobData
        } catch (err) {
          // OVA huérfana (generando sin registro ova_job): no reintentamos.
          if ((err as { status?: number })?.status === 404) return null
          throw err
        }
      },
      staleTime: 0,
      refetchInterval: (query: { state: { data?: JobData | null } }) => {
        const status = query.state.data?.status
        return status && !TERMINAL.has(status) ? POLL_MS : false
      },
    })),
  })

  const jobs: Record<string, JobInfo> = {}
  ids.forEach((ovaId, i) => {
    const data = results[i]?.data as JobData | undefined
    if (!data) return
    jobs[ovaId] = {
      jobId: data.job_id ?? null,
      status: data.status ?? null,
      progress: computeProgress(data),
      isInterrupted: data.status === 'interrupted',
    }
  })

  const resume = useCallback(
    async (ovaId: string) => {
      const data = qc.getQueryData(['ovaJob', ovaId]) as JobData | undefined
      if (!data?.job_id) return
      await resumeJob(data.job_id, [])
      qc.invalidateQueries({ queryKey: ['ovaJob', ovaId] })
    },
    [qc],
  )

  return { jobs, resume }
}
