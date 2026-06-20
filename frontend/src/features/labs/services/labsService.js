import { apiFetch, apiJson } from '../../../core/lib/http.js'

export const fetchModels = () => apiJson('/api/labs/models')

export const fetchPrompts = (phase, resourceType) =>
  apiJson(`/api/labs/prompts/${phase}/${resourceType}`)

export const startGeneration = (payload) =>
  apiJson('/api/labs/generate', { method: 'POST', body: JSON.stringify(payload) })

export const pollResults = (jobId) =>
  apiJson(`/api/labs/generate/${jobId}/results`)

export const improvePrompt = (payload) =>
  apiJson('/api/labs/improve-prompt', { method: 'POST', body: JSON.stringify(payload) })

export const markSelected = (resultId) =>
  apiJson(`/api/labs/results/${resultId}/select`, { method: 'PATCH' })

export const downloadScorm = async (resultId) => {
  const res = await apiFetch(`/api/labs/results/${resultId}/scorm`)
  if (!res.ok) throw new Error('No se pudo exportar el SCORM.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lab_result_${resultId.slice(0, 8)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
