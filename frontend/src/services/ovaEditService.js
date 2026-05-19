import { getToken } from '../lib/auth.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Error ${res.status}`)
  }
  return data
}

export async function fetchOvaEditorData(ovaId) {
  const res = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/editar`, {
    headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function savePhaseContent(ovaId, phaseId, content) {
  const res = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/fases/${phaseId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  })
  return handleResponse(res)
}

export async function triggerRegen(ovaId, { prompt = null, faseIds = [] } = {}) {
  const res = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/regenerar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ prompt, fase_ids: faseIds }),
  })
  return handleResponse(res)
}

export async function pollRegenProgress(ovaId, jobId) {
  const res = await fetch(
    `${API_BASE_URL}/api/ovas/${ovaId}/regenerar/${jobId}/progress`,
    { headers: authHeaders() },
  )
  return handleResponse(res)
}

export async function fetchOvaVersions(ovaId) {
  const res = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/versiones`, {
    headers: authHeaders(),
  })
  return handleResponse(res)
}

export async function downloadEditedScorm(ovaId) {
  const token = getToken()
  const res = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/export-scorm`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Error al exportar SCORM')
  }
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : 'ova.zip'
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
