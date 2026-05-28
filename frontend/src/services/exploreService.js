import { apiJson } from '../lib/http.js'

export function fetchExploreRecursos() {
  return apiJson('/api/agents/explore/recursos')
}

export function generateExploreResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/explore/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}
