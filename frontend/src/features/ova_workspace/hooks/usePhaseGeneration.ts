import { useState } from 'react'

interface Resource {
  id: string
  [key: string]: unknown
}

type GenerateFn = (resourceId: string, concept: string) => Promise<unknown>

// Estado de generación de un recurso de fase (selección + concepto + resultado).
// `generateFn` lo inyecta la página (PhasePage) ya ligada a su fase 5E.
export function usePhaseGeneration(generateFn: GenerateFn) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (!selectedResource || !concept.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await generateFn(selectedResource.id, concept.trim())
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
  }

  return {
    selectedResource,
    setSelectedResource,
    concept,
    setConcept,
    loading,
    result,
    error,
    generate,
    reset,
  }
}
