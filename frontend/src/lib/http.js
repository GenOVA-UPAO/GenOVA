// Pull base URL safely. Vite injects `import.meta.env`; raw Node (used by the
// cucumber-js unit suite) leaves it undefined, so guard the access.
const ENV = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
// Production fallback ensures https:// even if VITE_API_BASE_URL is missing at build time.
const RAW_BASE =
  ENV.VITE_API_BASE_URL ||
  (ENV.PROD ? 'https://genova-backend-production.up.railway.app' : 'http://localhost:8000')
export const API_BASE = RAW_BASE.replace(/\/$/, '')

const DEFAULT_TIMEOUT_MS = 15000

export class HttpError extends Error {
  constructor(message, { status = 0, code = '', body = null } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.body = body
  }
}

export async function apiFetch(path, init = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  const baseHeaders = { 'X-Requested-With': 'XMLHttpRequest' }
  if (init.body && !isFormData && !(init.headers?.['Content-Type'])) {
    baseHeaders['Content-Type'] = 'application/json'
  }
  const headers = { ...baseHeaders, ...(init.headers || {}) }
  const url = /^https?:/i.test(path) ? path : `${API_BASE}${path}`
  try {
    return await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(t)
  }
}

export async function apiJson(path, init = {}, opts = {}) {
  const res = await apiFetch(path, init, opts)
  let body = null
  try {
    body = await res.json()
  } catch {
    /* no JSON body */
  }
  if (!res.ok) {
    const message = body?.message || body?.detail || `HTTP ${res.status}`
    throw new HttpError(message, { status: res.status, code: body?.error || '', body })
  }
  return body ?? {}
}
