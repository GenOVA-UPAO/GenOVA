/**
 * Endpoints de configuración LLM del usuario (API keys + modelos de imagen).
 * Extraído de ovaSettingsService para separar dominio usuario vs dominio admin.
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

export function getApiKeys(): Promise<unknown> {
  return getJson('/api/users/me/api-keys', 'No se pudo cargar las API keys.')
}

export function saveApiKey(provider: string, key: string): Promise<unknown> {
  return putJson(
    '/api/users/me/api-keys',
    { [provider]: key },
    'No se pudo guardar la API key.',
  )
}

export interface ImageModel {
  id: string
  label?: string
}

export async function getImageModels(
  provider: string,
): Promise<ImageModel[]> {
  const res = await apiFetch(`/api/users/me/image-models?provider=${provider}`)
  if (!res.ok) throw new Error('No se pudo cargar los modelos de imagen.')
  const data = (await res.json()) as { models?: ImageModel[] }
  return data.models ?? []
}
