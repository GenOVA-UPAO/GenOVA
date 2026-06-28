import { apiJson } from '../lib/http/client'

export interface LlmSettingsParams {
  search?: string
  category?: string
  type?: string
  page?: number
  page_size?: number
}

export function fetchLlmSettings(
  params: LlmSettingsParams = {},
): Promise<unknown> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.category) searchParams.set('category', params.category)
  if (params.type) searchParams.set('type', params.type)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))
  const qs = searchParams.toString()
  return apiJson(`/api/users/me/llm-settings${qs ? `?${qs}` : ''}`)
}

export function saveLlmSettings(settings: unknown): Promise<unknown> {
  return apiJson('/api/users/me/llm-settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  })
}

export function refreshLlmCatalog(): Promise<unknown> {
  return apiJson('/api/users/me/llm-settings/refresh-catalog', {
    method: 'POST',
  })
}

export function saveEnabledModels(models: unknown): Promise<unknown> {
  return apiJson('/api/users/me/enabled-models', {
    method: 'PUT',
    body: JSON.stringify({ models }),
  })
}
