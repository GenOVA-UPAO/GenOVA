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

export function revertToVersion(ovaId, versionId) {
  return apiJson(`/api/ovas/${ovaId}/versiones/${versionId}/revert`, { method: 'POST' })
}

export function fetchVersionDiff(ovaId, v1, v2) {
  return apiJson(`/api/ovas/${ovaId}/versiones/diff?v1=${v1}&v2=${v2}`)
}

export function addPhase(ovaId, phaseType, prompt) {
  return apiJson(`/api/ovas/${ovaId}/fases`, {
    method: 'POST',
    body: JSON.stringify({ phase_type: phaseType, prompt }),
  })
}

export function fetchPhaseVersions(ovaId, phaseId) {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones`)
}

export function revertPhaseVersion(ovaId, phaseId, mvId) {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones/${mvId}/revert`, { method: 'POST' })
}

export function deletePhase(ovaId, phaseId) {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: 'DELETE' })
}

export function reorderPhases(ovaId, reorders) {
  return apiJson(`/api/ovas/${ovaId}/fases/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ reorders }),
  })
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
