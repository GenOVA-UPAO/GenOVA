import { apiJson } from '../lib/http.js'

export function fetchEngageRecursos() {
  return apiJson('/api/agents/engage/recursos')
}

export function generateEngageResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/engage/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}
