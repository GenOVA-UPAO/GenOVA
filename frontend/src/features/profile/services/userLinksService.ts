import { apiJson } from '../../../core/lib/http/client'

type LinkId = string | number

export function fetchMyLinks(): Promise<unknown> {
  return apiJson('/api/users/me/links')
}

export function fetchAllLinks(): Promise<unknown> {
  return apiJson('/api/users/links/admin')
}

export function createLinkCode(): Promise<unknown> {
  return apiJson('/api/users/me/links/code', { method: 'POST' })
}

export function inviteLink(email: string): Promise<unknown> {
  return apiJson('/api/users/me/links/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function acceptLink(code: string): Promise<unknown> {
  return apiJson('/api/users/me/links/accept', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function deleteMyLink(linkId: LinkId): Promise<unknown> {
  return apiJson(`/api/users/me/links/${linkId}`, { method: 'DELETE' })
}

export function deleteAnyLink(linkId: LinkId): Promise<unknown> {
  return apiJson(`/api/users/links/admin/${linkId}`, { method: 'DELETE' })
}

export function resendLink(linkId: LinkId): Promise<unknown> {
  return apiJson(`/api/users/me/links/${linkId}/resend`, { method: 'POST' })
}
