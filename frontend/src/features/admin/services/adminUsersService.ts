/**
 * Service de gestión de usuarios para el panel admin.
 * Retorna { ok, status, body } en vez de lanzar para permitir manejo
 * granular de errores en useUsersAdmin (distintos mensajes por operación).
 */
import { apiFetch } from '@/core/lib/http/client'

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

export const fetchCurrentUser = (): Promise<SendResult> =>
  send('/api/auth/me')

export const fetchRoles = (): Promise<SendResult> =>
  send('/api/roles')

export const fetchUsersPage = (page = 1): Promise<SendResult> =>
  send(`/api/users/?page=${page}&limit=10`)

export const updateUserRole = (
  userId: UserId,
  roleId: UserId,
): Promise<SendResult> =>
  send(`/api/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role_id: roleId }),
  })

export const updateUserProfile = (
  userId: UserId,
  updatedFields: Record<string, unknown>,
): Promise<SendResult> =>
  send(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updatedFields),
  })

export const updateUserStatus = (
  userId: UserId,
  isActive: boolean,
): Promise<SendResult> =>
  send(`/api/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })

export const unlockUser = (userId: UserId): Promise<SendResult> =>
  send(`/api/users/${userId}/unlock`, { method: 'POST' })

export const sendResetEmail = (userId: UserId): Promise<SendResult> =>
  send(`/api/users/${userId}/reset-password-email`, { method: 'POST' })

export const generateResetWhatsApp = (userId: UserId): Promise<SendResult> =>
  send(`/api/users/${userId}/reset-password-whatsapp`, { method: 'POST' })
