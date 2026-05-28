import { apiFetch, apiJson } from '../lib/http.js'

export function generateEngageResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/engage/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}

export function generateExploreResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/explore/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}

export function saveOva(prompt, phases, upload_ids = []) {
  return apiJson('/api/ova/save', {
    method: 'POST',
    body: JSON.stringify({ prompt, phases, upload_ids }),
  })
}

export async function downloadOvaScorm(ovaId) {
  const res = await apiFetch(`/api/ova/${ovaId}/scorm`)
  if (!res.ok) throw new Error('No se pudo exportar el paquete SCORM.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ova-scorm.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
