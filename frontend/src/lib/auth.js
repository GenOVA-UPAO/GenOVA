const AUTH_KEY = 'genova_is_authenticated'

export function saveToken() {
  localStorage.setItem(AUTH_KEY, 'true')
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

export function getToken() {
  return null
}

export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function decodeToken() {
  return null
}

export function isTokenExpired() {
  return false
}
