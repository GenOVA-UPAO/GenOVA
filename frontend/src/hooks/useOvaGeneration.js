import { useEffect, useMemo, useState } from 'react'
import {
  fetchLlmOptions,
  fetchOvaProgress,
  startOvaGeneration,
} from '../services/ovaGenerationService.js'

const MIN_PROMPT_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)
const PROGRESS_POLL_INTERVAL_MS = Number(import.meta.env.VITE_OVA_PROGRESS_POLL_MS || 1200)

function isPromptLongEnough(promptText) {
  return promptText.trim().length >= MIN_PROMPT_CHARS
}

export function useOvaGeneration() {
  const [prompt, setPrompt] = useState('')
  const [llmOptions, setLlmOptions] = useState([])
  const [selectedLlm, setSelectedLlm] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [jobId, setJobId] = useState('')
  const [progress, setProgress] = useState({
    percentage: 0,
    stage: 'Pendiente',
    status: 'idle',
  })

  const promptLength = prompt.length
  const isPromptValid = isPromptLongEnough(prompt)
  const hasLlmAvailable = llmOptions.length > 0

  const isSubmitDisabled = useMemo(() => {
    if (isGenerating || isLoadingOptions) return true
    if (!isPromptValid) return true
    if (!selectedLlm) return true
    if (!hasLlmAvailable) return true
    return false
  }, [hasLlmAvailable, isGenerating, isLoadingOptions, isPromptValid, selectedLlm])

  useEffect(() => {
    async function loadLlmOptions() {
      setIsLoadingOptions(true)
      setStatusMessage('')

      try {
        const data = await fetchLlmOptions()
        const options = Array.isArray(data?.items) ? data.items : []
        setLlmOptions(options)

        if (options.length > 0) {
          setSelectedLlm((prev) => prev || options[0].id)
          return
        }

        setSelectedLlm('')
        setStatusMessage('No hay modelos LLM habilitados por configuración.')
      } catch {
        setLlmOptions([])
        setSelectedLlm('')
        setStatusMessage('No se pudieron cargar las opciones LLM. Verifica backend.')
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadLlmOptions()
  }, [])

  useEffect(() => {
    if (!isGenerating || !jobId) {
      return undefined
    }

    let isCancelled = false
    let timerId = null

    async function pollProgress() {
      try {
        const data = await fetchOvaProgress(jobId)
        if (isCancelled) return

        const nextProgress = {
          percentage: Number(data?.percentage || 0),
          stage: data?.stage || 'Procesando...',
          status: data?.status || 'running',
        }

        setProgress(nextProgress)

        if (nextProgress.status === 'success') {
          setIsGenerating(false)
          setStatusMessage(data?.message || 'OVA generado correctamente.')
          return
        }

        if (nextProgress.status === 'error') {
          setIsGenerating(false)
          setStatusMessage(data?.message || 'Ocurrió un error durante la generación.')
          return
        }

        timerId = window.setTimeout(pollProgress, PROGRESS_POLL_INTERVAL_MS)
      } catch {
        if (isCancelled) return
        setIsGenerating(false)
        setStatusMessage('No se pudo obtener el progreso de generación.')
      }
    }

    pollProgress()

    return () => {
      isCancelled = true
      if (timerId) {
        window.clearTimeout(timerId)
      }
    }
  }, [isGenerating, jobId])

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
    setProgress({
      percentage: 0,
      stage: 'Pendiente',
      status: 'idle',
    })

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
      const result = await startOvaGeneration({ prompt: prompt.trim(), llmId: selectedLlm })
      setJobId(result?.job_id || '')
      setProgress({
        percentage: 0,
        stage: 'Validando solicitud',
        status: 'running',
      })
      setIsGenerating(true)
      setStatusMessage('Generación iniciada. Monitoreando progreso...')
    } catch (error) {
      if (error?.status === 400) {
        const errorCode = error?.code || ''
        if (
          errorCode === 'prompt_required' ||
          errorCode === 'prompt_too_short' ||
          errorCode === 'llm_invalid'
        ) {
          setFieldError(error?.message || 'Valida los campos del formulario.')
          return
        }
      }

      setStatusMessage(error?.message || 'No se pudo iniciar la generación de OVA.')
    }
  }

  return {
    fieldError,
    handleLlmChange,
    handlePromptChange,
    handleSubmit,
    hasLlmAvailable,
    isGenerating,
    isLoadingOptions,
    isSubmitDisabled,
    llmOptions,
    minPromptChars: MIN_PROMPT_CHARS,
    progress,
    prompt,
    promptLength,
    selectedLlm,
    statusMessage,
  }
}
