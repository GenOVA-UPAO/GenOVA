import { apiFetch } from '@/core/lib/http.js'

export async function getAnalytics() {
  const res = await apiFetch('/api/users/analytics')
  if (res.status === 403) {
    const err = new Error('forbidden')
    err.code = 'forbidden'
    throw err
  }
  if (!res.ok) {
    throw new Error('No se pudieron cargar las analíticas.')
  }
  return res.json()
}
