// Pull base URL safely. Vite injects `import.meta.env`; raw Node (used by the
// cucumber-js unit suite) leaves it undefined, so guard the access.
const ENV =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : ({} as ImportMetaEnv)
// Production fallback ensures https:// even if VITE_API_BASE_URL is missing at build time.
const RAW_BASE =
  ENV.VITE_API_BASE_URL ||
  (ENV.PROD
    ? 'https://genova-backend-production.up.railway.app'
    : 'http://localhost:8000')
export const API_BASE = RAW_BASE.replace(/\/$/, '')

const DEFAULT_TIMEOUT_MS = 15000
const AUTH_PATHS = new Set(['/api/auth/me', '/auth/login', '/auth/register'])

interface HttpErrorOptions {
  status?: number
  code?: string
  body?: unknown
}

interface JsonBody {
  message?: string
  detail?: string
  error?: string
}

export class HttpError extends Error {
  status: number
  code: string
  body: unknown

  constructor(
    message: string,
    { status = 0, code = '', body = null }: HttpErrorOptions = {},
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.body = body
  }
}

function isAuthEndpoint(path: string): boolean {
  return AUTH_PATHS.has(path) || path.startsWith('/api/auth/') || path.startsWith('/auth/')
}

async function notifyAuthExpired(path: string): Promise<void> {
  try {
    const { clearCurrentUser } = await import('../auth/me')
    clearCurrentUser('me')
  } catch {
    /* me.ts unavailable (raw Node tests) — no-op */
  }
  void path
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const isFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData
  const initHeaders = (init.headers as Record<string, string>) || {}
  const baseHeaders: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  }
  if (init.body && !isFormData && !initHeaders['Content-Type']) {
    baseHeaders['Content-Type'] = 'application/json'
  }
  const headers = { ...baseHeaders, ...initHeaders }
  const url = /^https?:/i.test(path) ? path : `${API_BASE}${path}`
  try {
    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      signal: ctrl.signal,
    })
    // BU-001 AC#3: any 401 from a protected endpoint means the JWT is gone;
    // clear the cache and let the AuthGate (the single listener) redirect.
    if (res.status === 401 && !isAuthEndpoint(path)) {
      void notifyAuthExpired(path)
    }
    return res
  } finally {
    clearTimeout(t)
  }
}

export async function apiJson<T = unknown>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const res = await apiFetch(path, init, opts)
  let body: JsonBody | null = null
  try {
    body = await res.json()
  } catch {
    /* no JSON body */
  }
  if (!res.ok) {
    const message = body?.message || body?.detail || `HTTP ${res.status}`
    throw new HttpError(message, {
      status: res.status,
      code: body?.error || '',
      body,
    })
  }
  return (body ?? {}) as T
}
