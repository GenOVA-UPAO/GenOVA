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
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
      </div>
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
    </div>
  )
}

export function LlmSettingsCard() {
  const hook = useLlmSettings(true)
  const { catalogFull, catalogStatus, error, loading, refreshingCatalog, retryRefresh, hasOwnLlmKey } = hook

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Modelos de generación (IA)
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasOwnLlmKey
            ? 'Habilita los modelos que quieres usar. Luego asígnalos a cada tipo de tarea.'
            : 'Configura una API key para explorar y personalizar los modelos disponibles.'}
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
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                <Lock weight="duotone" size={18} className="text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Catálogo de modelos bloqueado</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Añade una API key de Groq, OpenRouter u OpenCode en la pestaña{' '}
                  <strong className="font-semibold text-foreground">API Keys</strong>{' '}
                  para explorar y habilitar modelos adicionales.
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
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
