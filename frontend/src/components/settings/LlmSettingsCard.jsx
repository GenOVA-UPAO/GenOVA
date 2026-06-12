import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLlmSettings } from '../../hooks/useLlmSettings.js'
import { CatalogStatusAlert } from './CatalogStatusAlert.jsx'
import { LlmSettingsForm } from './LlmSettingsForm.jsx'
import { ModelCatalogBrowser } from './ModelCatalogBrowser.jsx'

function CatalogSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  )
}

export function LlmSettingsCard() {
  const hook = useLlmSettings(true)
  const { catalogFull, catalogStatus, error, loading, refreshingCatalog, retryRefresh } = hook

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Modelos de generación (IA)</h2>
        <p className="text-sm text-muted-foreground">
          Habilita los modelos que quieres usar. Luego asígnalos a cada tipo de tarea.
        </p>
      </div>

      {error && !loading ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>No se pudo cargar la configuración de IA</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="col-start-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => hook.load({})}>
              Reintentar
            </Button>
          </div>
        </Alert>
      ) : loading && catalogFull.length === 0 ? (
        <CatalogSkeleton />
      ) : (
        <>
          <CatalogStatusAlert
            catalogStatus={catalogStatus}
            refreshing={refreshingCatalog}
            onRetry={retryRefresh}
          />

          <ModelCatalogBrowser hook={hook} />

          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              Asignar modelo por tipo de tarea
            </h3>
            <LlmSettingsForm hook={hook} />
          </div>

          <div className="flex justify-end">
            <Button onClick={hook.save} disabled={hook.saving || loading}>
              {hook.saving ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
