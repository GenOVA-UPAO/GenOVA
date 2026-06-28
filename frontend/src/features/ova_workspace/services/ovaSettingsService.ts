/**
 * Endpoints de configuración de generación de OVA del usuario.
 *
 * Funciones admin → features/admin/services/adminSettingsService.ts
 * API keys / image models → features/ova_workspace/services/userLlmSettingsService.ts
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

export function getOvaSettings(): Promise<unknown> {
  return getJson(
    '/api/users/me/ova-settings',
    'No se pudo cargar la configuración de generación.',
  )
}

export function saveOvaSettings(data: unknown): Promise<unknown> {
  return putJson(
    '/api/users/me/ova-settings',
    data,
    'No se pudo guardar la configuración.',
  )
}
