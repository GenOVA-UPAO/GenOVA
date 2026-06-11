import { useCallback, useState } from 'react'
import { fetchPrompts } from '../../services/labsService.js'

/**
 * Loads the base prompt for a (phase, resource_type) and holds the editable
 * prompt text used for Labs test runs. Prompts are NOT persisted — Labs is a
 * sandbox; the production prompts live in the backend code.
 */
export function useLabPrompt() {
  const [basePrompt, setBasePrompt] = useState('')
  const [promptText, setPromptText] = useState('')
  const [loadingPrompts, setLoadingPrompts] = useState(false)

  const loadPrompts = useCallback(async (phase, type) => {
    if (!phase || !type) return
    setLoadingPrompts(true)
    try {
      const data = await fetchPrompts(phase, type)
      setBasePrompt(data.base_prompt || '')
      setPromptText(data.base_prompt || '')
    } catch {
      setBasePrompt('')
      setPromptText('')
    } finally {
      setLoadingPrompts(false)
    }
  }, [])

  const resetToBase = useCallback(() => setPromptText(basePrompt), [basePrompt])

  return { basePrompt, promptText, setPromptText, loadingPrompts, loadPrompts, resetToBase }
}
