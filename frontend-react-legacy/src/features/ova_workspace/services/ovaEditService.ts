import { apiFetch, apiJson } from '../../../core/lib/http/client'

export function fetchOvaEditorData(ovaId: string): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/editar`)
}

export function savePhaseContent(
  ovaId: string,
  phaseId: string,
  content: string,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function triggerRegen(
  ovaId: string,
  {
    prompt = null,
    faseIds = [],
  }: { prompt?: string | null; faseIds?: string[] } = {},
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/regenerar`, {
    method: 'POST',
    body: JSON.stringify({ prompt, fase_ids: faseIds }),
  })
}

export function pollRegenProgress(
  ovaId: string,
  jobId: string,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/regenerar/${jobId}/progress`)
}

export function fetchOvaVersions(ovaId: string): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/versiones`)
}

export function revertToVersion(
  ovaId: string,
  versionId: string,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/versiones/${versionId}/revert`, {
    method: 'POST',
  })
}

export function fetchVersionDiff(
  ovaId: string,
  v1: string | number,
  v2: string | number,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/versiones/diff?v1=${v1}&v2=${v2}`)
}

export function addPhase(
  ovaId: string,
  phaseType: string,
  prompt: string,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/fases`, {
    method: 'POST',
    body: JSON.stringify({ phase_type: phaseType, prompt }),
  })
}

export function fetchPhaseVersions(
  ovaId: string,
  phaseId: string,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones`)
}

export function revertPhaseVersion(
  ovaId: string,
  phaseId: string,
  mvId: string,
): Promise<unknown> {
  return apiJson(
    `/api/ovas/${ovaId}/fases/${phaseId}/versiones/${mvId}/revert`,
    {
      method: 'POST',
    },
  )
}

export function deletePhase(ovaId: string, phaseId: string): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: 'DELETE' })
}

export function reorderPhases(
  ovaId: string,
  reorders: unknown,
): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/fases/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ reorders }),
  })
}

export async function downloadEditedScorm(ovaId: string): Promise<void> {
  const res = await apiFetch(`/api/ovas/${ovaId}/export-scorm`)
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message || 'Error al exportar SCORM')
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as {
      download_url: string
      filename?: string
    }
    const a = document.createElement('a')
    a.href = data.download_url
    if (data.filename) a.download = data.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }
  // disk fallback: stream binary
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : 'ova.zip'
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
