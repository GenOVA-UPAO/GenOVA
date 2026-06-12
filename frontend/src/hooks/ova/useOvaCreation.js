import { useCallback, useState } from 'react'
import { useOvaUploads } from './useOvaUploads.js'
import { useOvaJob } from './useOvaJob.js'

const MIN_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)
const ALL_PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
const EMPTY_SELECTIONS = Object.fromEntries(ALL_PHASES.map((p) => [p, []]))

// Thin orchestrator: prompt + modal selection state, composed with the upload
// hook (upload_ids) and the job hook (start/poll/retry via EN-013). No fetch
// here (R9) — all I/O is delegated. Generation runs server-side as a job and
// the client only polls + retries failed resources.
export function useOvaCreation() {
  const [prompt, setPrompt] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selections, setSelections] = useState(EMPTY_SELECTIONS)
  // OVA content theme (color × design); default UPAO brand. Sent to the job.
  const [theme, setTheme] = useState({ color: 'upao', design: 'upao' })

  const {
    uploads, uploadIds, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaUploads()

  const jobApi = useOvaJob()
  const { phase, start, reset: resetJob, restore } = jobApi

  const totalResources = ALL_PHASES.reduce((s, p) => s + (selections[p]?.length ?? 0), 0)
  const canConfigure = prompt.trim().length >= MIN_CHARS
  const isGenerating = phase === 'starting' || phase === 'polling'
  const canGenerate = canConfigure && ALL_PHASES.every((p) => (selections[p]?.length ?? 0) > 0) && !isGenerating

  const confirmSelections = useCallback((picks) => {
    setSelections({ ...EMPTY_SELECTIONS, ...picks })
    setIsModalOpen(false)
  }, [])

  const reset = useCallback(() => {
    setPrompt('')
    setSelections(EMPTY_SELECTIONS)
    resetJob()
  }, [resetJob])

  const generate = useCallback(() => {
    if (!canGenerate) return
    start({ prompt: prompt.trim(), uploadIds, selections, theme })
  }, [canGenerate, start, prompt, uploadIds, selections, theme])

  const openModal = useCallback(() => setIsModalOpen(true), [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  return {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    selections, totalResources,
    theme, setTheme,
    canConfigure, canGenerate, isGenerating,
    generate, reset, restore, minChars: MIN_CHARS,
    // job orchestration (viewmodel, outcome, retry actions, jobId)
    job: jobApi,
    // uploads
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  }
}
