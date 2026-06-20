import { Button } from '@/core/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/core/components/ui/alert'

// R8 — total failure: no resource completed, so no OVA is created. Show a
// general error with an Error ID (from any failed resource) + a retry-all CTA.
// Never render an empty OVA.
export function TotalFailurePanel({ viewModel = [], onRetryAll }) {
  const errorId = viewModel.find((r) => r.error_id)?.error_id

  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTitle>No se pudo generar el OVA</AlertTitle>
        <AlertDescription>
          Lo sentimos, hubo un error generando los recursos. Ningún recurso se completó,
          por lo que no se guardó ningún OVA.
          {errorId ? (
            <p className="mt-1 text-xs">
              Error ID: <span className="font-mono">{errorId}</span>
            </p>
          ) : null}
        </AlertDescription>
      </Alert>
      <Button
        type="button"
        variant="destructive"
        onClick={onRetryAll}
      >
        Reintentar generación
      </Button>
    </div>
  )
}
