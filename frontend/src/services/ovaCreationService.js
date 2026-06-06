import { apiFetch, apiJson } from '../lib/http.js'

// ── HU-022: server-side generation jobs (EN-013) ────────────────────────────
// All fetch/apiJson for the jobs flow lives here (R9: services own I/O).

// POST /api/ova/jobs → 202 { job_id, status: "queued" }.
// `resources` = [{ phase_type, resource_type }] (resource_type is the catalog id).
export function startJob({ prompt, llm = null, uploadIds = [], resources }) {
  return apiJson('/api/ova/jobs', {
    method: 'POST',
    body: JSON.stringify({ prompt, llm, upload_ids: uploadIds, resources }),
  })
}

// GET /api/ova/jobs/{job_id} → job state + per-resource status (no content).
export function getJobStatus(jobId) {
  return apiJson(`/api/ova/jobs/${jobId}`)
}

// GET /api/ova/jobs?ova_id=<id> → latest job for an OVA (HU-023 lookup).
export function getJobByOvaId(ovaId) {
  return apiJson(`/api/ova/jobs?ova_id=${ovaId}`)
}

// GET /api/ova/jobs/{job_id}/resources/{resource_id}/content → { id, phase_type,
// resource_type, content }. Only for `done` resources (409 otherwise, 404 if alien).
export function getResourceContent(jobId, resourceId) {
  return apiJson(`/api/ova/jobs/${jobId}/resources/${resourceId}/content`)
}

// POST /api/ova/jobs/{job_id}/resume → 202 { job_id, status, resumed }.
// resourceIds omitted/empty → resume all pending/error; otherwise only those ids.
export function resumeJob(jobId, resourceIds) {
  const body = resourceIds && resourceIds.length > 0 ? { resource_ids: resourceIds } : {}
  return apiJson(`/api/ova/jobs/${jobId}/resume`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function downloadOvaScorm(ovaId) {
  const res = await apiFetch(`/api/ova/${ovaId}/scorm`)
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
