import { apiFetch } from '@/core/lib/http.js'

/** Confirma el correo con el token del enlace. 200 → cuenta verificada (el
 *  backend setea la cookie de sesión). */
export async function verifyEmail(token) {
  const res = await apiFetch('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo verificar el correo.')
  }
  return data
}

/** Reenvía el enlace de verificación. Respuesta siempre genérica (anti-enum). */
export async function resendVerification(email) {
  const res = await apiFetch('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  return data?.message || 'Si el correo está pendiente de verificar, te enviamos un nuevo enlace.'
}
