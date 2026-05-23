import { getToken } from '../lib/auth.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function fetchLlmOptions() {
  const token = getToken()
  const response = await fetch(`${apiBaseUrl}/api/ova/llm-options`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('No se pudieron obtener los motores de IA disponibles.')
  }
  const data = await response.json()
  return data.items || []
}
