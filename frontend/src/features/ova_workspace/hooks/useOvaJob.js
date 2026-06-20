import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { startJob, getJobStatus, resumeJob } from '../services/ovaCreationService.js'
import { toResourceViewModel, pruneSelection, jobOutcome } from '../../../core/lib/ovaJobViewModel.js'

const POLL_MS = Number(import.meta.env?.VITE_JOB_POLL_MS || 2000)
const ALL_PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
const EMPTY_SELECTIONS = Object.fromEntries(ALL_PHASES.map((p) => [p, []]))

// Traduce la selección del modal a `resources:[{phase_type, resource_type}]` (B1).
function toResourcesPayload(selections) {
  const out = []
  for (const phase of ALL_PHASES) {
    for (const r of selections[phase] || []) {
      out.push({ phase_type: phase, resource_type: String(r.id) })
    }
  }
  return out
}

// Orquesta un job de generación server-side vía TanStack Query: start (imperativo)
// → poll (useQuery con refetchInterval hasta terminal) → viewmodel + reintentos.
export function useOvaJob() {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState(null)
  const [selections, setSelections] = useState(EMPTY_SELECTIONS)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [selectedFailedIds, setSelectedFailedIds] = useState([])

  const { data: job } = useQuery({
    queryKey: ['ovaJob', jobId],
    queryFn: () => getJobStatus(jobId),
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return POLL_MS
      const vm = toResourceViewModel(data.resources, selections)
      return jobOutcome(data, vm).isTerminal ? false : POLL_MS
    },
  })

  const viewModel = useMemo(
    () => toResourceViewModel(job?.resources, selections),
    [job, selections],
  )
  const outcome = useMemo(() => jobOutcome(job, viewModel), [job, viewModel])
  const cleanSelection = useMemo(
    () => pruneSelection(selectedFailedIds, viewModel),
    [selectedFailedIds, viewModel],
  )

  let phase = 'idle'
  if (starting) phase = 'starting'
  else if (jobId && job && outcome.isTerminal) phase = 'terminal'
  else if (jobId) phase = 'polling'

  const start = useCallback(async ({ prompt, uploadIds, selections: sel, theme }) => {
    setSelections(sel)
    setError('')
    setSelectedFailedIds([])
    setStarting(true)
    setJobId(null)
    try {
      const resources = toResourcesPayload(sel)
      const { job_id } = await startJob({ prompt, uploadIds, resources, theme })
      setJobId(job_id)
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar la generación.')
    } finally {
      setStarting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setJobId(null)
    setSelections(EMPTY_SELECTIONS)
    setError('')
    setSelectedFailedIds([])
    setStarting(false)
  }, [])

  const restore = useCallback((existingJobId) => {
    setError('')
    setSelectedFailedIds([])
    setJobId(existingJobId)
  }, [])

  const resumeAndPoll = useCallback(
    async (ids) => {
      if (!jobId) return
      setError('')
      try {
        await resumeJob(jobId, ids)
        qc.invalidateQueries({ queryKey: ['ovaJob', jobId] })
      } catch (err) {
        setError(err?.message || 'No se pudo reintentar la generación.')
      }
    },
    [jobId, qc],
  )

  const retryOne = useCallback((resourceId) => resumeAndPoll([resourceId]), [resumeAndPoll])
  const retrySelected = useCallback(() => resumeAndPoll(cleanSelection), [resumeAndPoll, cleanSelection])
  const retryAll = useCallback(() => resumeAndPoll([]), [resumeAndPoll])

  const toggleFailed = useCallback((resourceId) => {
    setSelectedFailedIds((curr) =>
      curr.includes(resourceId) ? curr.filter((x) => x !== resourceId) : [...curr, resourceId]
    )
  }, [])

  const selectAllFailed = useCallback(() => {
    setSelectedFailedIds(viewModel.filter((r) => r.selectable).map((r) => r.id))
  }, [viewModel])

  return {
    jobId, job: job ?? null, phase, error, viewModel, outcome,
    selectedFailedIds: cleanSelection,
    start, reset, restore, retryOne, retrySelected, retryAll, toggleFailed, selectAllFailed,
  }
}
