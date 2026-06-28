/**
 * Endpoints de configuración de administrador de plataforma.
 * Separado de ovaSettingsService para respetar la arquitectura por dominio.
 */
import { apiFetch } from '@/core/lib/http/client'

async function getJson(path: string, errMsg: string): Promise<unknown> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(errMsg)
  return res.json()
}

async function putJson(
  path: string,
  body: unknown,
  errMsg: string,
): Promise<unknown> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(b.detail || errMsg)
  }
  return res.json()
}

export function getPlatformConfig(): Promise<unknown> {
  return getJson(
    '/api/admin/platform-config',
    'No se pudo cargar la configuración de plataforma.',
  )
}

export function savePlatformConfigKey(
  provider: string,
  key: string,
): Promise<unknown> {
  return putJson(
    '/api/admin/platform-config',
    { [provider]: key },
    'No se pudo guardar la API key de plataforma.',
  )
}

export function getAdminLlmConfig(): Promise<unknown> {
  return getJson(
    '/api/admin/llm-config',
    'No se pudo cargar la configuración de modelos.',
  )
}

export function saveAdminLlmConfig(config: unknown): Promise<unknown> {
  return putJson(
    '/api/admin/llm-config',
    config,
    'No se pudo guardar la configuración de modelos.',
  )
}

export function getAdminNodesConfig(): Promise<unknown> {
  return getJson(
    '/api/admin/nodes-config',
    'No se pudo cargar la configuración de nodos.',
  )
}

export function saveAdminNodesConfig(payload: unknown): Promise<unknown> {
  return putJson(
    '/api/admin/nodes-config',
    payload,
    'No se pudo guardar la configuración de nodos.',
  )
}
