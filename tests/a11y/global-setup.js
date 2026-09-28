// Inicia sesión una sola vez por rol y guarda las cookies para todos los specs.
// El backend limita a 5 logins por email/minuto (email_throttle.py), así que
// repetir el login UI en cada test hacía la suite intermitente.
import { request } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'

import { ADMIN, USER } from './a11y-helpers.js'

const AUTH_DIR = path.join(os.tmpdir(), 'genova-a11y-auth')
export const USER_STATE = path.join(AUTH_DIR, 'user.json')
export const ADMIN_STATE = path.join(AUTH_DIR, 'admin.json')

async function saveState(baseURL, account, file) {
  const context = await request.newContext({ baseURL })
  try {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const res = await context.post('/api/auth/login', {
        data: { email: account.email, password: account.pass, remember_me: true },
      })
      if (res.ok()) {
        await context.storageState({ path: file })
        return
      }
      // 429 = throttle por email: esperar la ventana de 60s antes de reintentar.
      if (res.status() !== 429 || attempt === 4) {
        throw new Error(`login ${account.email} falló: ${res.status()} ${await res.text()}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 31000))
    }
  } finally {
    await context.dispose()
  }
}

export default async function globalSetup() {
  const baseURL = process.env.BASE_URL ?? 'http://localhost:4200'
  await saveState(baseURL, USER, USER_STATE)
  await saveState(baseURL, ADMIN, ADMIN_STATE)
}
