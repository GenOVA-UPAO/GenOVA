import { getToken } from '../lib/auth.js'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function fetchExploreRecursos() {
  const res = await fetch(`${BASE}/api/agents/explore/recursos`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('No se pudieron cargar los recursos EXPLORE.')
  return res.json()
}

export async function generateExploreResource(resource_type, concept, upload_ids = []) {
  const res = await fetch(`${BASE}/api/agents/explore/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error al generar el recurso.')
  }
  return res.json()
}
