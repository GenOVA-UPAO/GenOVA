const AUTH_KEY = 'genova_token'

export function saveToken(token) {
  localStorage.setItem(AUTH_KEY, token)
}

export function getToken() {
  return localStorage.getItem(AUTH_KEY)
}

export async function clearToken() {
  localStorage.removeItem(AUTH_KEY)
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST' })
  } catch (err) {
    console.error('Error al realizar logout en el servidor:', err)
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem(AUTH_KEY)
}

export function decodeToken() {
  return null
}

export function isTokenExpired() {
  return false
}