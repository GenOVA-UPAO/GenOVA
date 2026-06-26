import { ErrorBoundary } from 'react-error-boundary'
import { useLocation } from 'react-router'
import { Button } from '@/core/components/ui/button'
import { captureException } from '@/core/lib/observability/sentry'

// Fallback a pantalla completa con la estética Editorial Académico UPAO:
// papel cálido, regla de acento naranja y serif de display en el título.
// Responsive: card centrada, max-w controlado, paddings fluidos.
function ErrorFallback({ error, resetErrorBoundary }) {
  const detail = error?.message ?? 'Error desconocido'
  const isDev = import.meta.env?.DEV

  return (
    <section
      role="alert"
      className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <div
          className="mx-auto mb-5 h-1 w-12 rounded-full bg-accent-brand"
          aria-hidden="true"
        />
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Algo salió mal
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado en esta sección. Puedes reintentar o
          volver al inicio.
        </p>

        {isDev && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            {detail}
          </pre>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={resetErrorBoundary} className="w-full sm:w-auto">
            Reintentar
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href="/dashboard">Ir al inicio</a>
          </Button>
        </div>
      </div>
    </section>
  )
}

// Captura errores de render en el árbol React y muestra el fallback en vez de
// dejar la pantalla en blanco. Se resetea al navegar (resetKeys = pathname),
// para que un error en una ruta no bloquee las demás. Reporta a Sentry.
export function RootErrorBoundary({ children }) {
  const location = useLocation()

  const handleError = (error, info) => {
    captureException(error, { componentStack: info?.componentStack })
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
  )
}
