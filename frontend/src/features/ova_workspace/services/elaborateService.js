import { apiJson } from '../../../core/lib/http.js'

export function fetchElaborateRecursos() {
  return apiJson('/api/agents/elaborate/recursos')
}

export function generateElaborateResource(resource_type, concept, upload_ids = []) {
  return apiJson('/api/agents/elaborate/generate', {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}
