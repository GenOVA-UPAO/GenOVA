import { Lock, Warning, SlidersHorizontal, GridFour } from '@phosphor-icons/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLlmSettings } from '../../hooks/useLlmSettings.js'
import { CatalogStatusAlert } from './CatalogStatusAlert.jsx'
import { LlmSettingsForm } from './LlmSettingsForm.jsx'
import { ModelCatalogBrowser } from './ModelCatalogBrowser.jsx'

function CatalogSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full rounded-xl" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
      </div>
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
    </div>
  )
}

export function LlmSettingsCard() {
  const hook = useLlmSettings(true)
  const { catalogFull, catalogStatus, error, loading, refreshingCatalog, retryRefresh, hasOwnLlmKey } = hook

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      {error && !loading ? (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl">
          <Warning weight="duotone" size={20} />
          <AlertTitle className="font-bold">No se pudo cargar la configuración de IA</AlertTitle>
          <AlertDescription className="font-medium text-destructive/80">{error}</AlertDescription>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => hook.load({})} className="shadow-sm">
              Reintentar conexión
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

          <Tabs defaultValue="assign" className="space-y-6">
            <TabsList className="bg-muted/30 p-1 rounded-xl glass-card border border-border/50">
              <TabsTrigger value="assign" className="rounded-lg font-bold text-xs">
                <SlidersHorizontal size={16} weight="bold" className="mr-2" /> Asignación por tarea
              </TabsTrigger>
              <TabsTrigger value="catalog" className="rounded-lg font-bold text-xs">
                <GridFour size={16} weight="bold" className="mr-2" /> Catálogo de modelos
                {catalogFull.length > 0 && <span className="ml-2 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[9px]">{catalogFull.length}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assign" className="space-y-6 mt-0">
              {!hasOwnLlmKey && (
                <div className="rounded-2xl border border-blue-200/50 bg-blue-50/50 p-4 flex items-center gap-3 glass-card shadow-sm">
                  <div className="rounded-full bg-blue-100 p-1.5 text-blue-600 shrink-0">
                    <span className="text-sm">ℹ</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Usando configuración de Plataforma UPAO</p>
                    <p className="text-xs font-medium text-blue-800/80 mt-0.5">Agrega tu API Key para personalizar los modelos de cada tarea.</p>
                  </div>
                </div>
              )}
              
              <LlmSettingsForm hook={hook} readOnly={!hasOwnLlmKey} />
              
              {hasOwnLlmKey && (
                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button onClick={hook.save} disabled={hook.saving || loading} className="shadow-md font-bold">
                    {hook.saving ? 'Guardando…' : 'Guardar asignaciones'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="catalog" className="mt-0">
              {hasOwnLlmKey ? (
                <ModelCatalogBrowser hook={hook} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center glass-card">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                    <Lock weight="duotone" size={24} className="text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <p className="text-base font-bold text-foreground font-display">Catálogo de modelos bloqueado</p>
                    <p className="text-sm font-medium text-muted-foreground">
                      Añade una API key en la pestaña <strong className="text-foreground">API Keys Personales</strong> para explorar y habilitar modelos adicionales.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  )
}
