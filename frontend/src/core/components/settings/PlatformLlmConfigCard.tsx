import { Robot } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LlmTaskRow } from '@/core/components/settings/LlmTaskRow.tsx'
import { Button } from '@/core/components/ui/button'
import type { Draft, EffectiveConfig } from '@/core/lib/llm/llmConfigDraft'
import { toDraft, toPayload } from '@/core/lib/llm/llmConfigDraft'
import { useAdminLlmConfig } from '@/features/admin/hooks/useAdminLlmConfig'

export function PlatformLlmConfigCard() {
  const { config, catalog, save } = useAdminLlmConfig()
  const [draft, setDraft] = useState<Draft | null>(null)

  const tasks: string[] = (config.data as { tasks?: string[] })?.tasks ?? []
  useEffect(() => {
    if (config.data)
      setDraft(
        toDraft(
          (config.data as { config?: EffectiveConfig }).config,
          tasks,
        ),
      )
  }, [config.data, tasks])

  const handleSave = () => {
    save.mutate(toPayload(draft, tasks), {
      onSuccess: () => toast.success('Configuración de modelos guardada.'),
      onError: (e: Error) => toast.error(e.message || 'No se pudo guardar.'),
    })
  }

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-display font-bold text-foreground">
            Modelos de generación
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Modelo primario y cadena de fallback por tarea, usados por todos los
            OVAs. Solo admins. Los cambios aplican en ~30s.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Robot
            size={32}
            weight="duotone"
            className="text-primary hidden sm:block"
          />
          <Button
            onClick={handleSave}
            disabled={!draft || save.isPending}
            className="shadow-md font-bold w-full sm:w-auto"
          >
            {save.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {config.isLoading || !draft ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : config.isError ? (
        <p className="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          {(config.error as Error)?.message ||
            'No se pudo cargar la configuración.'}
        </p>
      ) : (
        <>
          {catalog.isError && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              ⚠ No se pudo cargar el catálogo de modelos; los selectores pueden
              venir vacíos.
            </p>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            {tasks.map((t) => (
              <LlmTaskRow
                key={t}
                task={t}
                value={draft[t]}
                models={
                  (catalog.data ?? []) as Array<{
                    provider: string
                    model_id: string
                    label?: string
                    modality?: string
                    context_length?: number
                    pricing?: string
                  }>
                }
                disabled={save.isPending}
                onChange={(next) =>
                  setDraft((d) => ({ ...(d ?? {}), [t]: next }) as Draft)
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
