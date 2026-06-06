import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startJob, getJobStatus, resumeJob } from '../services/ovaCreationService.js'

// States that don't need polling.
const TERMINAL_STATUSES = new Set(['done', 'error'])
import {
  toResourceViewModel,
  pruneSelection,
  jobOutcome,
} from '../lib/ovaJobViewModel.js'

const POLL_MS = Number(import.meta.env?.VITE_JOB_POLL_MS || 2000)
const EMPTY_SELECTIONS = { engage: [], explore: [] }

// Translate the modal selection ({ engage:[{id,...}], explore:[...] }) into the
// `resources:[{phase_type, resource_type}]` array the jobs API expects (B1).
function toResourcesPayload(selections) {
  const out = []
  for (const phase of ['engage', 'explore']) {
    for (const r of selections[phase] || []) {
      out.push({ phase_type: phase, resource_type: String(r.id) })
    }
  }
  return out
}

// Orchestrates one server-side generation job: start → poll → expose viewmodel
// and retry actions. No fetch lives here (R9) — it delegates to the service.
export function useOvaJob() {
  const [jobId, setJobId] = useState(null)
  const [job, setJob] = useState(null) // raw GET /jobs/{id} payload
  const [selections, setSelections] = useState(EMPTY_SELECTIONS)
  const [phase, setPhase] = useState('idle') // idle|starting|polling|terminal
  const [error, setError] = useState('')
  const [selectedFailedIds, setSelectedFailedIds] = useState([])

  const timerRef = useRef(null)
  const jobIdRef = useRef(null)
  const selectionsRef = useRef(EMPTY_SELECTIONS)
  const pollRef = useRef(null) // latest poll fn (avoids self-referential useCallback)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(() => pollRef.current?.(), POLL_MS)
  }, [])

  // Single poll tick: fetch status, schedule the next tick unless terminal.
  const poll = useCallback(async () => {
    const id = jobIdRef.current
    if (!id) return
    try {
      const data = await getJobStatus(id)
      if (jobIdRef.current !== id) return // stale (reset/unmount)
      setJob(data)
      const vm = toResourceViewModel(data.resources, selectionsRef.current)
      if (jobOutcome(data, vm).isTerminal) {
        setPhase('terminal')
        clearTimer()
      } else {
        schedule()
      }
    } catch (err) {
      if (jobIdRef.current !== id) return
      setError(err?.message || 'No se pudo consultar el estado de la generación.')
      schedule()
    }
  }, [clearTimer, schedule])

  // Keep the ref pointed at the latest poll fn (read by the recursive timer)
  // and clean up any in-flight timer on unmount (vercel: clean up timers).
  useEffect(() => {
    pollRef.current = poll
  }, [poll])
  useEffect(() => clearTimer, [clearTimer])

  const start = useCallback(
    async ({ prompt, llm, uploadIds, selections: sel }) => {
      clearTimer()
      selectionsRef.current = sel
      setSelections(sel)
      setError('')
      setJob(null)
      setSelectedFailedIds([])
      setPhase('starting')
      try {
        const resources = toResourcesPayload(sel)
        const { job_id } = await startJob({ prompt, llm, uploadIds, resources })
        jobIdRef.current = job_id
        setJobId(job_id)
        setPhase('polling')
        schedule()
      } catch (err) {
        setError(err?.message || 'No se pudo iniciar la generación.')
        setPhase('idle')
      }
    },
    [clearTimer, schedule]
  )

  const reset = useCallback(() => {
    clearTimer()
    jobIdRef.current = null
    selectionsRef.current = EMPTY_SELECTIONS
    setJobId(null)
    setJob(null)
    setSelections(EMPTY_SELECTIONS)
    setPhase('idle')
    setError('')
    setSelectedFailedIds([])
  }, [clearTimer])

  // Derived viewmodel + outcome (computed during render, not stored — vercel).
  const viewModel = useMemo(
    () => toResourceViewModel(job?.resources, selections),
    [job, selections]
  )
  const outcome = useMemo(() => jobOutcome(job, viewModel), [job, viewModel])

  // Keep the failed selection consistent with the latest viewmodel.
  const cleanSelection = useMemo(
    () => pruneSelection(selectedFailedIds, viewModel),
    [selectedFailedIds, viewModel]
  )

  const resumeAndPoll = useCallback(
    async (ids) => {
      const id = jobIdRef.current
      if (!id) return
      setError('')
      try {
        await resumeJob(id, ids)
        clearTimer()
        setPhase('polling')
        schedule()
      } catch (err) {
        setError(err?.message || 'No se pudo reintentar la generación.')
      }
    },
    [clearTimer, schedule]
  )

  // Restore an in-progress job from "Mis OVAs" (HU-023 R4).
  const restore = useCallback(
    async (existingJobId) => {
      clearTimer()
      setError('')
      setJob(null)
      setSelectedFailedIds([])
      jobIdRef.current = existingJobId
      setJobId(existingJobId)
      setPhase('polling')
      try {
        const data = await getJobStatus(existingJobId)
        setJob(data)
        if (TERMINAL_STATUSES.has(data.status)) {
          setPhase('terminal')
        } else {
          schedule()
        }
      } catch {
        schedule()
      }
    },
    [clearTimer, schedule]
  )

  const retryOne = useCallback((resourceId) => resumeAndPoll([resourceId]), [resumeAndPoll])
  const retrySelected = useCallback(
    () => resumeAndPoll(cleanSelection),
    [resumeAndPoll, cleanSelection]
  )
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
    jobId, job, phase, error, viewModel, outcome,
    selectedFailedIds: cleanSelection,
    start, reset, restore, retryOne, retrySelected, retryAll, toggleFailed, selectAllFailed,
  }
}
