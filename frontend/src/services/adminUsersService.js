import { getToken } from '../lib/auth.js'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const authHeaders = (json = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` }
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

async function send(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, init)
  let body = null
  try {
    body = await res.json()
  } catch {
    /* response had no JSON body — leave body as null */
  }
  return { ok: res.ok, status: res.status, body: body ?? {} }
}

export async function fetchCurrentUser() {
  return send('/api/auth/me', { headers: authHeaders() })
}

export async function fetchRoles() {
  return send('/api/roles', { headers: authHeaders() })
}

export async function fetchUsersPage(page = 1) {
  return send(`/api/users?page=${page}&limit=10`, { headers: authHeaders() })
}

export async function updateUserRole(userId, roleId) {
  return send(`/api/users/${userId}/role`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify({ role_id: roleId }),
  })
}

export async function updateUserProfile(userId, updatedFields) {
  return send(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(updatedFields),
  })
}

export async function updateUserStatus(userId, isActive) {
  return send(`/api/users/${userId}/status`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify({ is_active: isActive }),
  })
}

export async function unlockUser(userId) {
  return send(`/api/users/${userId}/unlock`, { method: 'POST', headers: authHeaders() })
}

export async function sendResetEmail(userId) {
  return send(`/api/users/${userId}/reset-password-email`, {
    method: 'POST',
    headers: authHeaders(),
  })
}

export async function generateResetWhatsApp(userId) {
  return send(`/api/users/${userId}/reset-password-whatsapp`, {
    method: 'POST',
    headers: authHeaders(),
  })
}
