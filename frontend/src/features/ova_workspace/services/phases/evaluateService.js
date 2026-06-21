import { apiJson } from '../../../../core/lib/http.js'

export function fetchEvaluateRecursos() {
  return apiJson('/api/agents/evaluate/recursos')
}

export function generateEvaluateResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/evaluate/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}
