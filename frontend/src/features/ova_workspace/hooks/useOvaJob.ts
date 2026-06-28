import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type BackendResource,
  jobOutcome,
  pruneSelection,
  type Selections,
  toResourceViewModel,
} from '../lib/ovaJobViewModel'
import {
  getJobStatus,
  resumeJob,
  startJob,
} from '../services/ovaCreationService'
import { useJobStream } from './useJobStream'

const POLL_MS = Number(import.meta.env?.VITE_JOB_POLL_MS || 2000)
// Heartbeat lento cuando el SSE empuja en vivo: red de seguridad por si un proxy
// bufferea el stream y el progreso se congela, sin volver al poll agresivo.
const STREAM_HEARTBEAT_MS = 15000
const ALL_PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
const EMPTY_SELECTIONS = Object.fromEntries(
  ALL_PHASES.map((p) => [p, []]),
) as Selections

interface JobSnapshot {
  job_id?: string
  ova_id?: string | null
  status?: string
  resources?: BackendResource[]
}

interface StartArgs {
  prompt: string
  uploadIds: string[]
  selections: Selections
  theme?: unknown
  resourceConfigs?: Record<string, unknown>
}

// Traduce la selección del modal a `resources:[{phase_type, resource_type}]` (B1).
function toResourcesPayload(selections: Selections) {
  const out: { phase_type: string; resource_type: string }[] = []
  for (const phase of ALL_PHASES) {
    for (const r of selections[phase] || []) {
      out.push({ phase_type: phase, resource_type: String(r.id) })
    }
  }
  return out
}

// Orquesta un job de generación server-side vía TanStack Query.
export function useOvaJob() {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)
  const [selections, setSelections] = useState<Selections>(EMPTY_SELECTIONS)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([])
  const streamingRef = useRef(false)

  const { data: job } = useQuery({
    queryKey: ['ovaJob', jobId],
    queryFn: () => getJobStatus(jobId as string) as Promise<JobSnapshot>,
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return streamingRef.current ? STREAM_HEARTBEAT_MS : POLL_MS
      const vm = toResourceViewModel(data.resources, selections)
      if (jobOutcome(data, vm).isTerminal) return false
      return streamingRef.current ? STREAM_HEARTBEAT_MS : POLL_MS
    },
  })

  const viewModel = useMemo(
    () => toResourceViewModel(job?.resources, selections),
    [job, selections],
  )
  const outcome = useMemo(() => jobOutcome(job, viewModel), [job, viewModel])
  const streaming = useJobStream(jobId, !!jobId && !outcome.isTerminal)
  streamingRef.current = streaming
  const cleanSelection = useMemo(
    () => pruneSelection(selectedFailedIds, viewModel),
    [selectedFailedIds, viewModel],
  )

  let phase = 'idle'
  if (starting) phase = 'starting'
  else if (jobId && job && outcome.isTerminal) phase = 'terminal'
  else if (jobId) phase = 'polling'

  const start = useCallback(
    async ({
      prompt,
      uploadIds,
      selections: sel,
      theme,
      resourceConfigs = {},
    }: StartArgs) => {
      setSelections(sel)
      setError('')
      setSelectedFailedIds([])
      setStarting(true)
      setJobId(null)
      try {
        const resources = toResourcesPayload(sel)
        const { job_id } = await startJob({
          prompt,
          uploadIds,
          resources,
          theme,
          resourceConfigs,
        })
        setJobId(job_id)
      } catch (err) {
        setError((err as Error)?.message || 'No se pudo iniciar la generación.')
      } finally {
        setStarting(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setJobId(null)
    setSelections(EMPTY_SELECTIONS)
    setError('')
    setSelectedFailedIds([])
    setStarting(false)
  }, [])

  const restore = useCallback((existingJobId: string) => {
    setError('')
    setSelectedFailedIds([])
    setJobId(existingJobId)
  }, [])

  const resumeAndPoll = useCallback(
    async (ids: string[]) => {
      if (!jobId) return
      setError('')
      try {
        await resumeJob(jobId, ids)
        qc.invalidateQueries({ queryKey: ['ovaJob', jobId] })
      } catch (err) {
        setError(
          (err as Error)?.message || 'No se pudo reintentar la generación.',
        )
      }
    },
    [jobId, qc],
  )

  const retryOne = useCallback(
    (resourceId: string) => resumeAndPoll([resourceId]),
    [resumeAndPoll],
  )
  const retrySelected = useCallback(
    () => resumeAndPoll(cleanSelection),
    [resumeAndPoll, cleanSelection],
  )
  const retryAll = useCallback(() => resumeAndPoll([]), [resumeAndPoll])

  const toggleFailed = useCallback((resourceId: string) => {
    setSelectedFailedIds((curr) =>
      curr.includes(resourceId)
        ? curr.filter((x) => x !== resourceId)
        : [...curr, resourceId],
    )
  }, [])

  const selectAllFailed = useCallback(() => {
    setSelectedFailedIds(viewModel.filter((r) => r.selectable).map((r) => r.id))
  }, [viewModel])

  return {
    jobId,
    job: job ?? null,
    phase,
    error,
    viewModel,
    outcome,
    selectedFailedIds: cleanSelection,
    start,
    reset,
    restore,
    retryOne,
    retrySelected,
    retryAll,
    toggleFailed,
    selectAllFailed,
  }
}
