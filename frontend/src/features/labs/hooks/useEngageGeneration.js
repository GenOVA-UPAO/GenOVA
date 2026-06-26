import { useState } from 'react'
import { generatePhaseResource } from '../../ova_workspace/services/phases/phaseService'

export function useEngageGeneration() {
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
      const data = await generatePhaseResource('engage', selectedResource.id, concept.trim())
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
