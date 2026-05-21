import { useCallback, useState } from 'react'
import {
  activateVersion,
  deactivateVersion,
  fetchPrompts,
  saveVersion,
} from '../services/labsService.js'

/**
 * Manages prompt version state for a given (phase, resource_type).
 * Responsible for loading, saving, activating, and applying versions.
 */
export function useLabVersions() {
  const [basePrompt, setBasePrompt] = useState('')
  const [promptText, setPromptText] = useState('')
  const [versions, setVersions] = useState([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)

  const loadPrompts = useCallback(async (phase, type) => {
    if (!phase || !type) return
    setLoadingPrompts(true)
    try {
      const data = await fetchPrompts(phase, type)
      setBasePrompt(data.base_prompt || '')
      setPromptText(data.base_prompt || '')
      setVersions(data.versions || [])
    } catch {
      setBasePrompt('')
      setPromptText('')
      setVersions([])
    } finally {
      setLoadingPrompts(false)
    }
  }, [])

  const handleSaveVersion = useCallback(
    async (phase, type, prompt, modelId, provider, notes = '') => {
      if (!phase || !type || !modelId) return
      await saveVersion({ phase, resource_type: type, prompt_text: prompt, model_id: modelId, provider, notes })
      await loadPrompts(phase, type)
    },
    [loadPrompts],
  )

  const handleActivateVersion = useCallback(
    async (versionId, phase, type) => {
      await activateVersion(versionId)
      await loadPrompts(phase, type)
    },
    [loadPrompts],
  )

  const handleDeactivateVersion = useCallback(
    async (versionId, phase, type) => {
      await deactivateVersion(versionId)
      await loadPrompts(phase, type)
    },
    [loadPrompts],
  )

  const loadVersion = useCallback((version, models, setModelA) => {
    setPromptText(version.prompt_text)
    const found = models.find((m) => m.id === version.model_id && m.provider === version.provider)
    if (found) setModelA(found)
  }, [])

  const resetToBase = useCallback(() => setPromptText(basePrompt), [basePrompt])

  return {
    basePrompt,
    promptText,
    setPromptText,
    versions,
    loadingPrompts,
    loadPrompts,
    resetToBase,
    handleSaveVersion,
    handleActivateVersion,
    handleDeactivateVersion,
    loadVersion,
  }
}
