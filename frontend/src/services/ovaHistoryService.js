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
