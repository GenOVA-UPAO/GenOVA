const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'

import { getToken } from '../lib/auth.js'

function buildAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.message || 'No se pudo completar la operación.')
    error.code = data?.error || ''
    error.status = response.status
    throw error
  }
  return data
}

export async function fetchOvas({ page = 1, limit = 10, search = '', status = '' } = {}) {
  const params = new URLSearchParams({ page, limit })
  if (search.trim()) params.set('search', search.trim())
  if (status.trim()) params.set('status', status.trim())

  const response = await fetch(`${API_BASE_URL}/api/ovas?${params}`, {
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function deleteOva(ovaId) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function fetchTrashedOvas({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page, limit })
  const response = await fetch(`${API_BASE_URL}/api/ovas/papelera?${params}`, {
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function fetchTrashCount() {
  const response = await fetch(`${API_BASE_URL}/api/ovas/papelera/count`, {
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function restoreOva(ovaId) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/restaurar`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function permanentDeleteOva(ovaId) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/permanente`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function batchMoveToTrash(ovaIds) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/lote/papelera`, {
    method: 'POST',
    headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ova_ids: ovaIds }),
  })
  return parseResponse(response)
}

export async function batchRestore(ovaIds) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/lote/restaurar`, {
    method: 'POST',
    headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ova_ids: ovaIds }),
  })
  return parseResponse(response)
}

export async function duplicateOva(ovaId) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/duplicar`, {
    method: 'POST',
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

export async function batchPermanentDelete(ovaIds) {
  const response = await fetch(`${API_BASE_URL}/api/ovas/lote/permanente`, {
    method: 'DELETE',
    headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ova_ids: ovaIds }),
  })
  return parseResponse(response)
}

export async function downloadOvaFile(ovaId, title = 'ova') {
  const response = await fetch(`${API_BASE_URL}/api/ovas/${ovaId}/download`, {
    headers: buildAuthHeaders(),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data?.message || 'No se pudo descargar el archivo.')
    error.code = data?.error || ''
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
