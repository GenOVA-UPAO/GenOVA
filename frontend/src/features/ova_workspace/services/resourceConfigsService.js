import { apiFetch } from '../../../core/lib/http.js'

const _KEY = 'genova_rc'
const _TTL = 7 * 24 * 60 * 60 * 1000

function _read() {
  try {
    const raw = localStorage.getItem(_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > _TTL) return null
    return data
  } catch { return null }
}

function _write(data) {
  try { localStorage.setItem(_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export async function getResourceConfigs() {
  const cached = _read()
  if (cached) return cached
  const res = await apiFetch('/api/users/me/resource-configs')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de recursos.')
  const data = await res.json()
  _write(data)
  return data
}

export async function putResourceConfigs(configs) {
  _write({ configs })
  const res = await apiFetch('/api/users/me/resource-configs', {
    method: 'PUT',
    body: JSON.stringify({ configs }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'No se pudo guardar la configuración de recursos.')
  }
  return res.json()
}
