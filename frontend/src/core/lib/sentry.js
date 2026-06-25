// Inicialización opcional de Sentry (error tracking de frontend).
//
// Solo se activa si VITE_SENTRY_DSN está definido. El import es dinámico para
// que el SDK quede en un chunk aparte y NO pese en el bundle inicial cuando no
// se usa (Vercel: bundle-conditional).
const DSN = import.meta.env?.VITE_SENTRY_DSN

export function initSentry() {
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
