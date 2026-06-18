import { apiFetch, apiJson } from '../lib/http.js'

export function fetchOvas({ page = 1, limit = 10, search = '', status = '' } = {}) {
  const params = new URLSearchParams({ page, limit })
  if (search.trim()) params.set('search', search.trim())
  if (status.trim()) params.set('status', status.trim())
  return apiJson(`/api/ovas?${params}`)
}

export function deleteOva(ovaId) {
  return apiJson(`/api/ovas/${ovaId}`, { method: 'DELETE' })
}

export function fetchTrashedOvas({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page, limit })
  return apiJson(`/api/ovas/papelera?${params}`)
}

export function fetchTrashCount() {
  return apiJson('/api/ovas/papelera/count')
}

export function restoreOva(ovaId) {
  return apiJson(`/api/ovas/${ovaId}/restaurar`, { method: 'PATCH' })
}

export function permanentDeleteOva(ovaId) {
  return apiJson(`/api/ovas/${ovaId}/permanente`, { method: 'DELETE' })
}

export function batchMoveToTrash(ovaIds) {
  return apiJson('/api/ovas/lote/papelera', {
    method: 'POST',
    body: JSON.stringify({ ova_ids: ovaIds }),
  })
}

export function batchRestore(ovaIds) {
  return apiJson('/api/ovas/lote/restaurar', {
    method: 'POST',
    body: JSON.stringify({ ova_ids: ovaIds }),
  })
}

export function duplicateOva(ovaId) {
  return apiJson(`/api/ovas/${ovaId}/duplicar`, { method: 'POST' })
}

export function updateOvaMetadata(ovaId, { title, description }) {
  return apiJson(`/api/ovas/${ovaId}/metadata`, {
    method: 'PATCH',
    body: JSON.stringify({ title, description }),
  })
}

export function batchPermanentDelete(ovaIds) {
  return apiJson('/api/ovas/lote/permanente', {
    method: 'DELETE',
    body: JSON.stringify({ ova_ids: ovaIds }),
  })
}

export async function downloadOvaFile(ovaId, title = 'ova') {
  const res = await apiFetch(`/api/ovas/${ovaId}/download`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = new Error(data?.message || 'No se pudo descargar el archivo.')
    error.code = data?.error || ''
    error.status = res.status
    throw error
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    const a = document.createElement('a')
    a.href = data.download_url
    if (data.filename) a.download = data.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }
  // disk fallback: stream binary
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
