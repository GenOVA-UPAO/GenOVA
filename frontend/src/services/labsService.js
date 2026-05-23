import { getToken } from '../lib/auth.js'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

async function ok(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const fetchModels = () =>
  fetch(`${BASE}/api/labs/models`, { headers: headers() }).then(ok)

export const fetchPrompts = (phase, resourceType) =>
  fetch(`${BASE}/api/labs/prompts/${phase}/${resourceType}`, { headers: headers() }).then(ok)

export const startGeneration = (payload) =>
  fetch(`${BASE}/api/labs/generate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  }).then(ok)

export const pollResults = (jobId) =>
  fetch(`${BASE}/api/labs/generate/${jobId}/results`, { headers: headers() }).then(ok)

export const improvePrompt = (payload) =>
  fetch(`${BASE}/api/labs/improve-prompt`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  }).then(ok)

export const markSelected = (resultId) =>
  fetch(`${BASE}/api/labs/results/${resultId}/select`, {
    method: 'PATCH',
    headers: headers(),
  }).then(ok)

export const downloadScorm = async (resultId) => {
  const res = await fetch(`${BASE}/api/labs/results/${resultId}/scorm`, { headers: headers() })
  if (!res.ok) throw new Error('No se pudo exportar el SCORM.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lab_result_${resultId.slice(0, 8)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
