import { useEffect, useMemo, useState } from 'react'
import { fetchLlmOptions } from '../services/ovaGenerationService.js'

export function useOvaLlmOptions(setStatusMessage) {
  const [llmOptions, setLlmOptions] = useState([])
  const [selectedLlm, setSelectedLlm] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)

  const hasLlmAvailable = useMemo(() => llmOptions.length > 0, [llmOptions])

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
  }, [setStatusMessage])

  return {
    hasLlmAvailable,
    isLoadingOptions,
    llmOptions,
    selectedLlm,
    setSelectedLlm,
  }
}
