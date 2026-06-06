import { useCallback, useState } from 'react'
import { useOvaUploads } from './useOvaUploads.js'
import { useOvaJob } from './useOvaJob.js'

const MIN_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)

// Thin orchestrator: prompt + modal selection state, composed with the upload
// hook (upload_ids) and the job hook (start/poll/retry via EN-013). No fetch
// here (R9) — all I/O is delegated. Generation runs server-side as a job and
// the client only polls + retries failed resources.
export function useOvaCreation() {
  const [prompt, setPrompt] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [engageSelection, setEngageSelection] = useState([])
  const [exploreSelection, setExploreSelection] = useState([])

  const {
    uploads, uploadIds, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaUploads()

  const jobApi = useOvaJob()
  const { phase, start, reset: resetJob, restore } = jobApi

  const totalResources = engageSelection.length + exploreSelection.length
  const canConfigure = prompt.trim().length >= MIN_CHARS
  const isGenerating = phase === 'starting' || phase === 'polling'
  const canGenerate = canConfigure && totalResources > 0 && !isGenerating

  const confirmSelections = useCallback(({ engage, explore }) => {
    setEngageSelection(engage ?? [])
    setExploreSelection(explore ?? [])
    setIsModalOpen(false)
  }, [])

  const reset = useCallback(() => {
    setPrompt('')
    setEngageSelection([])
    setExploreSelection([])
    resetJob()
  }, [resetJob])

  const generate = useCallback(() => {
    if (!canGenerate) return
    start({
      prompt: prompt.trim(),
      llm: null,
      uploadIds,
      selections: { engage: engageSelection, explore: exploreSelection },
    })
  }, [canGenerate, start, prompt, uploadIds, engageSelection, exploreSelection])

  const openModal = useCallback(() => setIsModalOpen(true), [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  return {
    prompt, setPrompt,
    isModalOpen, openModal, closeModal, confirmSelections,
    engageSelection, exploreSelection, totalResources,
    canConfigure, canGenerate, isGenerating,
    generate, reset, restore, minChars: MIN_CHARS,
    // job orchestration (viewmodel, outcome, retry actions, jobId)
    job: jobApi,
    // uploads
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  }
}
