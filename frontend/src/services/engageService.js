import { getToken } from '../lib/auth.js'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function fetchEngageRecursos() {
  const res = await fetch(`${BASE}/api/agents/engage/recursos`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('No se pudieron cargar los recursos ENGAGE.')
  return res.json()
}

export async function generateEngageResource(resource_type, concept) {
  const res = await fetch(`${BASE}/api/agents/engage/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ resource_type, concept }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error al generar el recurso.')
  }
  return res.json()
}
