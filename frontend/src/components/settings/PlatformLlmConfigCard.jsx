import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAdminLlmConfig } from '../../hooks/admin/useAdminLlmConfig.js'
import { toDraft, toPayload } from '../../lib/llmConfigDraft.js'
import { LlmTaskRow } from './LlmTaskRow.jsx'

export function PlatformLlmConfigCard() {
  const { config, catalog, save } = useAdminLlmConfig()
  const [draft, setDraft] = useState(null)

  const tasks = config.data?.tasks ?? []
  useEffect(() => {
    if (config.data) setDraft(toDraft(config.data.config, config.data.tasks ?? []))
  }, [config.data])

  const handleSave = () => {
    save.mutate(toPayload(draft, tasks), {
      onSuccess: () => toast.success('Configuración de modelos guardada.'),
      onError: (e) => toast.error(e.message || 'No se pudo guardar.'),
    })
  }

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Modelos de generación</h2>
          <p className="text-sm text-muted-foreground">
            Modelo primario y cadena de fallback por tarea, usados por todos los OVAs.
            Solo admins. Los cambios aplican en ~30s.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!draft || save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>

      {config.isLoading || !draft ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : config.isError ? (
        <p className="text-sm text-destructive">
          {config.error?.message || 'No se pudo cargar la configuración.'}
        </p>
      ) : (
        <>
          {catalog.isError && (
            <p className="text-xs text-destructive">
              No se pudo cargar el catálogo de modelos; los selectores pueden venir vacíos.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {tasks.map((t) => (
              <LlmTaskRow
                key={t}
                task={t}
                value={draft[t]}
                models={catalog.data ?? []}
                disabled={save.isPending}
                onChange={(next) => setDraft((d) => ({ ...d, [t]: next }))}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
