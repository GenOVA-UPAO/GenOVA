import { apiFetch, apiJson } from '../../../core/lib/http/client'

// ── HU-022: server-side generation jobs (EN-013) ────────────────────────────
// All fetch/apiJson for the jobs flow lives here (R9: services own I/O).

export interface StartJobArgs {
  prompt: string
  uploadIds?: string[]
  resources: Array<{ phase_type: string; resource_type: string }>
  theme?: unknown
  resourceConfigs?: Record<string, unknown>
}

export interface JobAck {
  job_id: string
  status: string
}

// POST /api/ova/jobs → 202 { job_id, status: "queued" }.
export function startJob({
  prompt,
  uploadIds = [],
  resources,
  theme,
  resourceConfigs = {},
}: StartJobArgs): Promise<JobAck> {
  return apiJson<JobAck>('/api/ova/jobs', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      upload_ids: uploadIds,
      resources,
      theme,
      resource_configs: resourceConfigs,
    }),
  })
}

// GET /api/ova/jobs/{job_id} → job state + per-resource status (no content).
export function getJobStatus(jobId: string): Promise<unknown> {
  return apiJson(`/api/ova/jobs/${jobId}`)
}

// GET /api/ova/jobs?ova_id=<id> → latest job for an OVA (HU-023 lookup).
export function getJobByOvaId(ovaId: string): Promise<unknown> {
  return apiJson(`/api/ova/jobs?ova_id=${ovaId}`)
}

// GET /api/ova/jobs/{job_id}/resources/{resource_id}/content → resource HTML.
export function getResourceContent(
  jobId: string,
  resourceId: string,
): Promise<unknown> {
  return apiJson(`/api/ova/jobs/${jobId}/resources/${resourceId}/content`)
}

// POST /api/ova/jobs/{job_id}/resume → 202 { job_id, status, resumed }.
export function resumeJob(
  jobId: string,
  resourceIds?: string[],
): Promise<unknown> {
  const body =
    resourceIds && resourceIds.length > 0 ? { resource_ids: resourceIds } : {}
  return apiJson(`/api/ova/jobs/${jobId}/resume`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// POST /api/ova/jobs/{job_id}/cancel → { job_id, status: "canceled" }.
export function cancelJob(jobId: string): Promise<{ job_id: string; status: string }> {
  return apiJson<{ job_id: string; status: string }>(`/api/ova/jobs/${jobId}/cancel`, {
    method: 'POST',
  })
}

// Traduce la selección del modal a `resources:[{phase_type, resource_type}]`.
const _ALL_PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
export function toResourcesPayload(
  selections: Record<string, { id: string | number }[]>,
) {
  const out: { phase_type: string; resource_type: string }[] = []
  for (const phase of _ALL_PHASES) {
    for (const r of selections[phase] || []) {
      out.push({ phase_type: phase, resource_type: String(r.id) })
    }
  }
  return out
}

export async function downloadOvaScorm(ovaId: string): Promise<void> {
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
