import { apiFetch } from '../../../core/lib/http/client'

const _KEY = 'genova_rc'
const _TTL = 7 * 24 * 60 * 60 * 1000

interface CacheEnvelope {
  data: unknown
  ts: number
}

function _read(): unknown {
  try {
    const raw = localStorage.getItem(_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as CacheEnvelope
    if (Date.now() - ts > _TTL) return null
    return data
  } catch {
    return null
  }
}

function _write(data: unknown): void {
  try {
    localStorage.setItem(_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    /* localStorage unavailable */
  }
}

export async function getResourceConfigs(): Promise<unknown> {
  const cached = _read()
  if (cached) return cached
  const res = await apiFetch('/api/users/me/resource-configs')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de recursos.')
  const data = await res.json()
  _write(data)
  return data
}

export async function putResourceConfigs(configs: unknown): Promise<unknown> {
  _write({ configs })
  const res = await apiFetch('/api/users/me/resource-configs', {
    method: 'PUT',
    body: JSON.stringify({ configs }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(body.detail || 'No se pudo guardar la configuración de recursos.')
  }
  return res.json()
}
