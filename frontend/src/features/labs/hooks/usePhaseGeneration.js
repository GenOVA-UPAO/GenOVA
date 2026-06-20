import { useState } from 'react'

export function usePhaseGeneration(generateFn) {
  const [selectedResource, setSelectedResource] = useState(null)
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    if (!selectedResource || !concept.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await generateFn(selectedResource.id, concept.trim())
      setResult(data)
    } catch (e) {
      setError(e.message)
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
