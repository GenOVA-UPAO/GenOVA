import { apiFetch } from '../lib/http.js'

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
