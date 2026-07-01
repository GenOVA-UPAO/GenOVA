import { ArrowsClockwise, Warning } from '@phosphor-icons/react'
import { Alert, AlertDescription, AlertTitle } from '@/core/components/ui/alert'
import { Button } from '@/core/components/ui/button'
import { PROVIDER_LABELS } from '@/core/settings/lib/llmCatalogUtils'

interface CatalogStatusAlertProps {
  catalogStatus: Record<
    string,
    { ok: boolean; last_success_at?: string }
  > | null
  refreshing: boolean
  onRetry: () => void
}

function _formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

export function CatalogStatusAlert({
  catalogStatus,
  refreshing,
  onRetry,
}: CatalogStatusAlertProps) {
  const down = Object.entries(catalogStatus || {}).filter(
    ([, st]) => st && st.ok === false,
  )
  if (down.length === 0) return null

  const names = down.map(([p]) => PROVIDER_LABELS[p] || p).join(' y ')
  const lastOk = down
    .map(([, st]) => _formatTimestamp(st.last_success_at))
    .find(Boolean)

  return (
    <Alert className="border-accent-brand/40 bg-accent-brand/5">
      <Warning weight="duotone" className="text-accent-brand" />
      <AlertTitle>No pudimos obtener los modelos de {names}</AlertTitle>
      <AlertDescription>
        Se muestran los últimos datos disponibles.
        {lastOk ? ` Última actualización: ${lastOk}.` : ''}
      </AlertDescription>
      <div className="col-start-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          disabled={refreshing}
        >
          <ArrowsClockwise
            size={14}
            weight="duotone"
            className={refreshing ? 'animate-spin' : ''}
          />
          {refreshing ? 'Reintentando…' : 'Reintentar'}
        </Button>
      </div>
    </Alert>
  )
}
