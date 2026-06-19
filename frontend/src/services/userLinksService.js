import { apiJson } from '../lib/http.js'

export function fetchMyLinks() {
  return apiJson('/api/users/me/links')
}

export function fetchAllLinks() {
  return apiJson('/api/users/links/admin')
}

export function createLinkCode() {
  return apiJson('/api/users/me/links/code', { method: 'POST' })
}

export function inviteLink(email) {
  return apiJson('/api/users/me/links/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function acceptLink(code) {
  return apiJson('/api/users/me/links/accept', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function deleteMyLink(linkId) {
  return apiJson(`/api/users/me/links/${linkId}`, { method: 'DELETE' })
}

export function deleteAnyLink(linkId) {
  return apiJson(`/api/users/links/admin/${linkId}`, { method: 'DELETE' })
}

export function resendLink(linkId) {
  return apiJson(`/api/users/me/links/${linkId}/resend`, { method: 'POST' })
}
