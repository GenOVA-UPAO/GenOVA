import { useEffect, useState } from 'react'
import { fetchLlmOptions } from '../services/llmOptionsService.js'

export function useLlmOptions() {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchLlmOptions()
      .then((items) => {
        if (!cancelled) setOptions(items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Error cargando motores de IA.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { options, loading, error }
}
