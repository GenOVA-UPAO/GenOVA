const AUTH_KEY = 'genova_is_authenticated'
const TOKEN_KEY = 'genova_token'

export function saveToken(token) {
  localStorage.setItem(AUTH_KEY, 'true')
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export async function clearToken() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(TOKEN_KEY)
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST' })
  } catch (err) {
    console.error('Error al realizar logout en el servidor:', err)
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true' && !!getToken()
}

export function decodeToken() {
  return null
}

export function isTokenExpired() {
  return false
}

