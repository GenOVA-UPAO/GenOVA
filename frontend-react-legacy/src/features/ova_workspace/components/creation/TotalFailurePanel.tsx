import { Alert, AlertDescription, AlertTitle } from '@/core/components/ui/alert'
import { Button } from '@/core/components/ui/button'
import type { ResourceVM } from '@/features/ova_workspace/lib/ovaJobViewModel'

interface TotalFailurePanelProps {
  viewModel?: ResourceVM[]
  onRetryAll: () => void
}

export function TotalFailurePanel({
  viewModel = [],
  onRetryAll,
}: TotalFailurePanelProps) {
  const errorId = viewModel.find((r) => r.error_id)?.error_id

  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTitle>No se pudo generar el OVA</AlertTitle>
        <AlertDescription>
          Lo sentimos, hubo un error generando los recursos. Ningún recurso se
          completó, por lo que no se guardó ningún OVA.
          {errorId ? (
            <p className="mt-1 text-xs">
              Error ID: <span className="font-mono">{errorId}</span>
            </p>
          ) : null}
        </AlertDescription>
      </Alert>
      <Button type="button" variant="destructive" onClick={onRetryAll}>
        Reintentar generación
      </Button>
    </div>
  )
}
