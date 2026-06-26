import { useCallback, useEffect, useRef, useState } from 'react'
import {
  downloadScorm,
  fetchModels,
  improvePrompt,
  markSelected,
  pollResults,
  startGeneration,
} from '../services/labsService'
import { useLabPrompt } from './useLabPrompt.js'

// Cut from 2s → 5s. Generation latency dwarfs the polling interval; this
// reduces Render free-tier request load by ~60% without changing UX.
const POLL_MS = 5000

/**
 * Central hook for the Labs page (experimentation sandbox).
 * Composes useLabPrompt + generation + model state.
 */
export function useLabGeneration() {
  // Resource selection
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [selectedType, setSelectedType] = useState(null)

  // Editable prompt (delegated hook)
  const prompt = useLabPrompt()

  // Models
  const [models, setModels] = useState([])
  const [modelA, setModelA] = useState(null)
  const [modelB, setModelB] = useState(null)

  // Generation
  const [concept, setConcept] = useState('')
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState([])
  const [jobError, setJobError] = useState(null)
  const pollRef = useRef(null)

  // Winner + improvement
  const [winnerId, setWinnerId] = useState(null)
  const [improving, setImproving] = useState(false)
  const [improvedPrompt, setImprovedPrompt] = useState(null)

  const loadModels = useCallback(async () => {
    try {
      const data = await fetchModels()
      setModels(data.models || [])
    } catch {
      setModels([])
    }
  }, [])

  const selectResource = useCallback(
    (phase, type) => {
      setSelectedPhase(phase)
      setSelectedType(type)
      setResults([])
      setWinnerId(null)
      setImprovedPrompt(null)
      prompt.loadPrompts(phase, type)
    },
    [prompt],
  )

  const _stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => _stopPoll, [_stopPoll])

  const generate = useCallback(async () => {
    if (!selectedPhase || !selectedType || !concept.trim() || !modelA) return
    setGenerating(true)
    setResults([])
    setJobError(null)
    setWinnerId(null)
    setImprovedPrompt(null)

    const configs = [
      { model_id: modelA.id, provider: modelA.provider, prompt_text: prompt.promptText },
    ]
    if (modelB) configs.push({ model_id: modelB.id, provider: modelB.provider, prompt_text: prompt.promptText })

    try {
      const { job_id } = await startGeneration({
        phase: selectedPhase,
        resource_type: selectedType,
        concept: concept.trim(),
        model_configs: configs,
      })
      pollRef.current = setInterval(async () => {
        try {
          const data = await pollResults(job_id)
          setResults(data.results || [])
          if (data.finished) {
            _stopPoll()
            setGenerating(false)
          }
        } catch (err) {
          _stopPoll()
          setGenerating(false)
          setJobError(err.message)
        }
      }, POLL_MS)
    } catch (err) {
      setGenerating(false)
      setJobError(err.message)
    }
  }, [selectedPhase, selectedType, concept, modelA, modelB, prompt.promptText, _stopPoll])

  const selectWinner = useCallback(async (resultId) => {
    setWinnerId(resultId)
    try { await markSelected(resultId) } catch { /* non-critical */ }
  }, [])

  const handleImprovePrompt = useCallback(async () => {
    if (!winnerId || !selectedPhase || !selectedType) return
    setImproving(true)
    try {
      const data = await improvePrompt({
        current_prompt: prompt.promptText,
        result_id: winnerId,
        concept: concept.trim(),
        phase: selectedPhase,
        resource_type: selectedType,
      })
      setImprovedPrompt(data)
    } catch (err) {
      setImprovedPrompt({ improved_prompt: '', explanation: err.message })
    } finally {
      setImproving(false)
    }
  }, [winnerId, selectedPhase, selectedType, prompt.promptText, concept])

  const applyImprovedPrompt = useCallback(() => {
    if (improvedPrompt?.improved_prompt) prompt.setPromptText(improvedPrompt.improved_prompt)
  }, [improvedPrompt, prompt])

  const handleExportScorm = useCallback((resultId) => downloadScorm(resultId), [])

  return {
    selectedPhase, selectedType, selectResource,
    ...prompt,
    models, loadModels, modelA, setModelA, modelB, setModelB,
    concept, setConcept,
    generating, generate, results, jobError,
    winnerId, selectWinner,
    improving, improvedPrompt, handleImprovePrompt, applyImprovedPrompt,
    handleExportScorm,
  }
}
