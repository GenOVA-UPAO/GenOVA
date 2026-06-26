import { apiFetch } from '../../../core/lib/http/client'

// Helpers que colapsan el patrón repetido get/put (antes duplicado en ~10
// funciones): GET con mensaje de error genérico, PUT con `body.detail` del backend.
async function getJson(path: string, errMsg: string): Promise<unknown> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(errMsg)
  return res.json()
}

async function putJson(path: string, body: unknown, errMsg: string): Promise<unknown> {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) })
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(b.detail || errMsg)
  }
  return res.json()
}

export function getOvaSettings(): Promise<unknown> {
  return getJson('/api/users/me/ova-settings', 'No se pudo cargar la configuración de generación.')
}

export function saveOvaSettings(data: unknown): Promise<unknown> {
  return putJson('/api/users/me/ova-settings', data, 'No se pudo guardar la configuración.')
}

export async function getImageModels(provider: string): Promise<unknown[]> {
  const res = await apiFetch(`/api/users/me/image-models?provider=${provider}`)
  if (!res.ok) throw new Error('No se pudo cargar los modelos de imagen.')
  const data = (await res.json()) as { models?: unknown[] }
  return data.models ?? []
}

export function getApiKeys(): Promise<unknown> {
  return getJson('/api/users/me/api-keys', 'No se pudo cargar las API keys.')
}

export function saveApiKey(provider: string, key: string): Promise<unknown> {
  return putJson('/api/users/me/api-keys', { [provider]: key }, 'No se pudo guardar la API key.')
}

export function getPlatformConfig(): Promise<unknown> {
  return getJson('/api/admin/platform-config', 'No se pudo cargar la configuración de plataforma.')
}

export function savePlatformConfigKey(provider: string, key: string): Promise<unknown> {
  return putJson(
    '/api/admin/platform-config',
    { [provider]: key },
    'No se pudo guardar la API key de plataforma.',
  )
}

export function getAdminLlmConfig(): Promise<unknown> {
  return getJson('/api/admin/llm-config', 'No se pudo cargar la configuración de modelos.')
}

export function saveAdminLlmConfig(config: unknown): Promise<unknown> {
  return putJson('/api/admin/llm-config', config, 'No se pudo guardar la configuración de modelos.')
}

export function getAdminNodesConfig(): Promise<unknown> {
  return getJson('/api/admin/nodes-config', 'No se pudo cargar la configuración de nodos.')
}

export function saveAdminNodesConfig(payload: unknown): Promise<unknown> {
  return putJson('/api/admin/nodes-config', payload, 'No se pudo guardar la configuración de nodos.')
}
