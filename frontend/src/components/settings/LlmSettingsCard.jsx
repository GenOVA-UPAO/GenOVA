import { Lock, Warning } from '@phosphor-icons/react'
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
  const { catalogFull, catalogStatus, error, loading, refreshingCatalog, retryRefresh, hasOwnLlmKey } = hook

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
          <Warning weight="duotone" />
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

          {hasOwnLlmKey ? (
            <ModelCatalogBrowser hook={hook} />
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <Lock weight="duotone" size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">Catálogo de modelos bloqueado</p>
                <p className="text-xs text-muted-foreground">
                  Añade una API key de Groq, OpenRouter u OpenCode en la pestaña{' '}
                  <strong>API Keys</strong> para explorar y habilitar modelos adicionales.
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              Asignar modelo por tipo de tarea
            </h3>
            <LlmSettingsForm hook={hook} readOnly={!hasOwnLlmKey} />
          </div>

          {hasOwnLlmKey && (
            <div className="flex justify-end">
              <Button onClick={hook.save} disabled={hook.saving || loading}>
                {hook.saving ? 'Guardando…' : 'Guardar configuración'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
