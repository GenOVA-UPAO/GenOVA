import { apiFetch, apiJson } from '../lib/http.js'

export function fetchOvaEditorData(ovaId) {
  return apiJson(`/api/ovas/${ovaId}/editar`)
}

export function savePhaseContent(ovaId, phaseId, content) {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function triggerRegen(ovaId, { prompt = null, faseIds = [] } = {}) {
  return apiJson(`/api/ovas/${ovaId}/regenerar`, {
    method: 'POST',
    body: JSON.stringify({ prompt, fase_ids: faseIds }),
  })
}

export function pollRegenProgress(ovaId, jobId) {
  return apiJson(`/api/ovas/${ovaId}/regenerar/${jobId}/progress`)
}

export function fetchOvaVersions(ovaId) {
  return apiJson(`/api/ovas/${ovaId}/versiones`)
}

export async function downloadEditedScorm(ovaId) {
  const res = await apiFetch(`/api/ovas/${ovaId}/export-scorm`)
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
