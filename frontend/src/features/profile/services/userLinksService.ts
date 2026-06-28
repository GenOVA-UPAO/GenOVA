import { apiJson } from '../../../core/lib/http/client'

type LinkId = string | number

/** Vínculo de cuenta tal como lo devuelve el backend y lo consume `LinkRow`. */
export interface UserLink {
  id: string
  status: string
  owner_user_id?: string
  invite_email?: string
  linked?: { full_name?: string; email?: string } | null
  owner?: { email?: string }
  [key: string]: unknown
}

export interface LinksResponse {
  links?: UserLink[]
}

export interface LinkCodeResponse {
  code: string
}

export function fetchMyLinks(): Promise<LinksResponse> {
  return apiJson<LinksResponse>('/api/users/me/links')
}

export function fetchAllLinks(): Promise<LinksResponse> {
  return apiJson<LinksResponse>('/api/users/links/admin')
}

export function createLinkCode(): Promise<LinkCodeResponse> {
  return apiJson<LinkCodeResponse>('/api/users/me/links/code', {
    method: 'POST',
  })
}

export function inviteLink(email: string): Promise<LinkCodeResponse> {
  return apiJson<LinkCodeResponse>('/api/users/me/links/invite', {
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

export function resendLink(linkId: LinkId): Promise<LinkCodeResponse> {
  return apiJson<LinkCodeResponse>(`/api/users/me/links/${linkId}/resend`, {
    method: 'POST',
  })
}
