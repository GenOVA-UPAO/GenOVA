import { apiJson } from '../lib/http.js'

export async function fetchLlmOptions() {
  const data = await apiJson('/api/ova/llm-options')
  return data.items || []
}
