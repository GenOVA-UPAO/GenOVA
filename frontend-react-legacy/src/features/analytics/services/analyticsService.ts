import { apiFetch } from '@/core/lib/http/client'

export async function getAnalytics(): Promise<unknown> {
  const res = await apiFetch('/api/users/analytics')
  if (res.status === 403) {
    const err = new Error('forbidden') as Error & { code?: string }
    err.code = 'forbidden'
    throw err
  }
  if (!res.ok) {
    throw new Error('No se pudieron cargar las analíticas.')
  }
  return res.json()
}
