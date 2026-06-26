import { apiFetch } from '../../../core/lib/http/client'

type UserId = string | number

export interface SendResult {
  ok: boolean
  status: number
  body: unknown
}

async function send(path: string, init: RequestInit = {}): Promise<SendResult> {
  const res = await apiFetch(path, init)
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* no JSON body */
  }
  return { ok: res.ok, status: res.status, body: body ?? {} }
}

export function fetchCurrentUser(): Promise<SendResult> {
  return send('/api/auth/me')
}

export function fetchRoles(): Promise<SendResult> {
  return send('/api/roles')
}

export function fetchUsersPage(page = 1): Promise<SendResult> {
  return send(`/api/users/?page=${page}&limit=10`)
}

export function updateUserRole(userId: UserId, roleId: UserId): Promise<SendResult> {
  return send(`/api/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role_id: roleId }),
  })
}

export function updateUserProfile(
  userId: UserId,
  updatedFields: Record<string, unknown>,
): Promise<SendResult> {
  return send(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updatedFields),
  })
}

export function updateUserStatus(userId: UserId, isActive: boolean): Promise<SendResult> {
  return send(`/api/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

export function unlockUser(userId: UserId): Promise<SendResult> {
  return send(`/api/users/${userId}/unlock`, { method: 'POST' })
}

export function sendResetEmail(userId: UserId): Promise<SendResult> {
  return send(`/api/users/${userId}/reset-password-email`, { method: 'POST' })
}

export function generateResetWhatsApp(userId: UserId): Promise<SendResult> {
  return send(`/api/users/${userId}/reset-password-whatsapp`, { method: 'POST' })
}
