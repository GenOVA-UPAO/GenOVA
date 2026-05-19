import { getToken } from '../lib/auth.js'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
})

export async function generateEngageResource(resource_type, concept) {
  const res = await fetch(`${BASE}/api/agents/engage/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ resource_type, concept }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error generando recurso ENGAGE.')
  }
  return res.json()
}

export async function generateExploreResource(resource_type, concept) {
  const res = await fetch(`${BASE}/api/agents/explore/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ resource_type, concept }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error generando recurso EXPLORE.')
  }
  return res.json()
}

export async function saveOva(prompt, phases) {
  const res = await fetch(`${BASE}/api/ova/save`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ prompt, phases }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error guardando OVA.')
  }
  return res.json()
}

export async function downloadOvaScorm(ovaId) {
  const res = await fetch(`${BASE}/api/ova/${ovaId}/scorm`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
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
