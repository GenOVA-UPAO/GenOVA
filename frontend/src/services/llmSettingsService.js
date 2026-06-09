import { apiJson } from '../lib/http.js'

export function fetchLlmSettings() {
  return apiJson('/api/users/me/llm-settings')
}

export function saveLlmSettings(settings) {
  return apiJson('/api/users/me/llm-settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  })
}

export function saveEnabledModels(models) {
  return apiJson('/api/users/me/enabled-models', {
    method: 'PUT',
    body: JSON.stringify({ models }),
  })
}
