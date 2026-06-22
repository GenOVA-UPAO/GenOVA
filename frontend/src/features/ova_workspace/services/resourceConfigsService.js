import { apiFetch } from '../../../core/lib/http.js'

export async function getResourceConfigs() {
  const res = await apiFetch('/api/users/me/resource-configs')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de recursos.')
  return res.json()
}

export async function putResourceConfigs(configs) {
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
