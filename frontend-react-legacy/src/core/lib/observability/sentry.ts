// Inicialización opcional de Sentry (error tracking de frontend).
//
// Solo se activa si VITE_SENTRY_DSN está definido. El import es dinámico para
// que el SDK quede en un chunk aparte y NO pese en el bundle inicial cuando no
// se usa (Vercel: bundle-conditional).
//
// F3: primer módulo migrado a TypeScript (patrón de la migración incremental).
const DSN: string | undefined = import.meta.env?.VITE_SENTRY_DSN

export function initSentry(): void {
  if (!DSN) return
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        // Sin PII: no enviar datos de usuario/headers sensibles.
        sendDefaultPii: false,
        tracesSampleRate: 0,
      })
    })
    .catch(() => {
      /* fallo al cargar Sentry no debe romper la app */
    })
}

// Reporta una excepción capturada (p.ej. por un Error Boundary) a Sentry.
// No-op si no hay DSN. Import dinámico para no forzar el SDK en el bundle.
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!DSN || !error) return
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.captureException(error, context ? { extra: context } : undefined)
    })
    .catch(() => {
      /* reportar el error no debe, a su vez, romper la app */
    })
}
