import { apiFetch } from '../lib/http.js'

async function send(path, init = {}) {
  const res = await apiFetch(path, init)
  let body = null
  try {
    body = await res.json()
  } catch {
    /* no JSON body */
  }
  return { ok: res.ok, status: res.status, body: body ?? {} }
}

export function fetchCurrentUser() {
  return send('/api/auth/me')
}

export function fetchRoles() {
  return send('/api/roles')
}

export function fetchUsersPage(page = 1) {
  return send(`/api/users/?page=${page}&limit=10`)
}

export function updateUserRole(userId, roleId) {
  return send(`/api/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role_id: roleId }),
  })
}

export function updateUserProfile(userId, updatedFields) {
  return send(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updatedFields),
  })
}

export function updateUserStatus(userId, isActive) {
  return send(`/api/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

export function unlockUser(userId) {
  return send(`/api/users/${userId}/unlock`, { method: 'POST' })
}

export function sendResetEmail(userId) {
  return send(`/api/users/${userId}/reset-password-email`, { method: 'POST' })
}

export function generateResetWhatsApp(userId) {
  return send(`/api/users/${userId}/reset-password-whatsapp`, { method: 'POST' })
}
