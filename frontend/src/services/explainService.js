import { apiJson } from '../lib/http.js'

export function fetchExplainRecursos() {
  return apiJson('/api/agents/explain/recursos')
}

export function generateExplainResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/explain/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}
