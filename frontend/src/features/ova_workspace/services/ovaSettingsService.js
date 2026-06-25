import { apiFetch } from '../../../core/lib/http.js'

export async function getOvaSettings() {
  const res = await apiFetch('/api/users/me/ova-settings')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de generación.')
  return res.json()
}

export async function saveOvaSettings(data) {
  const res = await apiFetch('/api/users/me/ova-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'No se pudo guardar la configuración.')
  }
  return res.json()
}

export async function getApiKeys() {
  const res = await apiFetch('/api/users/me/api-keys')
  if (!res.ok) throw new Error('No se pudo cargar las API keys.')
  return res.json()
}

export async function saveApiKey(provider, key) {
  const res = await apiFetch('/api/users/me/api-keys', {
    method: 'PUT',
    body: JSON.stringify({ [provider]: key }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'No se pudo guardar la API key.')
  }
  return res.json()
}

export async function getPlatformConfig() {
  const res = await apiFetch('/api/admin/platform-config')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de plataforma.')
  return res.json()
}

export async function savePlatformConfigKey(provider, key) {
  const res = await apiFetch('/api/admin/platform-config', {
    method: 'PUT',
    body: JSON.stringify({ [provider]: key }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'No se pudo guardar la API key de plataforma.')
  }
  return res.json()
}

export async function getAdminLlmConfig() {
  const res = await apiFetch('/api/admin/llm-config')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de modelos.')
  return res.json()
}

export async function saveAdminLlmConfig(config) {
  const res = await apiFetch('/api/admin/llm-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'No se pudo guardar la configuración de modelos.')
  }
  return res.json()
}

export async function getAdminNodesConfig() {
  const res = await apiFetch('/api/admin/nodes-config')
  if (!res.ok) throw new Error('No se pudo cargar la configuración de nodos.')
  return res.json()
}

export async function saveAdminNodesConfig(payload) {
  const res = await apiFetch('/api/admin/nodes-config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'No se pudo guardar la configuración de nodos.')
  }
  return res.json()
}
