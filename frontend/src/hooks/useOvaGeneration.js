import { useMemo, useState } from 'react'
import { startOvaGeneration } from '../services/ovaGenerationService.js'
import { useOvaLlmOptions } from './useOvaLlmOptions.js'
import {
  buildStartStatusMessage,
  createIdleProgress,
  createRunningProgress,
  resolveStartGenerationFieldError,
} from './ovaGenerationHelpers.js'
import { useOvaProgressPolling } from './useOvaProgressPolling.js'
import { useOvaUploads } from './useOvaUploads.js'

const MIN_PROMPT_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)

function isPromptLongEnough(promptText) {
  return promptText.trim().length >= MIN_PROMPT_CHARS
}

export function useOvaGeneration() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [jobId, setJobId] = useState('')
  const [progress, setProgress] = useState(createIdleProgress())
  const [ovaContent, setOvaContent] = useState(null)

  const {
    hasLlmAvailable,
    isLoadingOptions,
    llmOptions,
    selectedLlm,
    setSelectedLlm,
  } = useOvaLlmOptions(setStatusMessage)

  useOvaProgressPolling({
    isGenerating,
    jobId,
    onOvaReady: setOvaContent,
    setIsGenerating,
    setProgress,
    setStatusMessage,
  })

  const {
    activeUploadsCount,
    handleFilesSelected,
    handleRemoveUpload,
    isUploadingFiles,
    maxUploadFiles,
    uploadError,
    uploadIds,
    uploads,
  } = useOvaUploads()

  const promptLength = prompt.length
  const isPromptValid = isPromptLongEnough(prompt)

  const isSubmitDisabled = useMemo(() => {
    if (isGenerating || isLoadingOptions || isUploadingFiles) return true
    if (!isPromptValid) return true
    if (!selectedLlm) return true
    if (!hasLlmAvailable) return true
    return false
  }, [
    hasLlmAvailable,
    isGenerating,
    isLoadingOptions,
    isPromptValid,
    isUploadingFiles,
    selectedLlm,
  ])

  function handlePromptChange(value) {
    setPrompt(value)
    if (fieldError) {
      setFieldError('')
    }
  }

  function handleLlmChange(value) {
    setSelectedLlm(value)
    if (fieldError) {
      setFieldError('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldError('')
    setStatusMessage('')
    setJobId('')
    setProgress(createIdleProgress())
    setOvaContent(null)

    if (!prompt.trim()) {
      setFieldError('El prompt es obligatorio.')
      return
    }

    if (!isPromptValid) {
      setFieldError(`El prompt debe tener al menos ${MIN_PROMPT_CHARS} caracteres.`)
      return
    }

    if (!selectedLlm || !hasLlmAvailable) {
      setFieldError('Selecciona un LLM válido para continuar.')
      return
    }

    try {
      const result = await startOvaGeneration({
        prompt: prompt.trim(),
        llmId: selectedLlm,
        uploadIds,
      })
      setJobId(result?.job_id || '')
      setProgress(createRunningProgress())
      setIsGenerating(true)
      setStatusMessage(buildStartStatusMessage(uploadIds.length))
    } catch (error) {
      if (error?.status === 400 || error?.status === 404) {
        const fieldMessage = resolveStartGenerationFieldError(error)
        if (fieldMessage) {
          setFieldError(fieldMessage)
          return
        }
      }

      setStatusMessage(error?.message || 'No se pudo iniciar la generación de OVA.')
    }
  }

  return {
    activeUploadsCount,
    fieldError,
    handleFilesSelected,
    handleLlmChange,
    handlePromptChange,
    handleRemoveUpload,
    handleSubmit,
    hasLlmAvailable,
    isGenerating,
    isLoadingOptions,
    isSubmitDisabled,
    isUploadingFiles,
    llmOptions,
    maxUploadFiles,
    minPromptChars: MIN_PROMPT_CHARS,
    ovaContent,
    progress,
    prompt,
    promptLength,
    selectedLlm,
    statusMessage,
    uploadError,
    uploads,
  }
}
