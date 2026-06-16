import { useEffect, useState } from 'react'
import { ArrowsClockwise, Lock, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getCurrentUser } from '../lib/me.js'
import { useAdminLlmConfig } from '../hooks/admin/useAdminLlmConfig.js'
import { toDraft, toPayload } from '../lib/llmConfigDraft.js'
import { LlmTaskRow } from '../components/settings/LlmTaskRow.jsx'

export function FallbackPage() {
  const [user, setUser] = useState(null)
  const [draft, setDraft] = useState(null)
  const { config, catalog, save } = useAdminLlmConfig()
  const isAdmin = user?.role === 'administrador'
  const tasks = config.data?.tasks ?? []

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  useEffect(() => {
    if (config.data) setDraft(toDraft(config.data.config, config.data.tasks ?? []))
  }, [config.data])

  const handleSave = () => {
    save.mutate(toPayload(draft, tasks), {
      onSuccess: () => toast.success('Cadena de fallback guardada.'),
      onError: (e) => toast.error(e.message || 'No se pudo guardar.'),
    })
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-brand">
            Configuracion IA
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Cadena de fallback
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ordena los modelos que GenOVA intenta cuando un proveedor falla,
            excede latencia o no responde.
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={handleSave} disabled={!draft || save.isPending} className="self-start gap-2">
            <ArrowsClockwise size={16} weight="duotone" />
            {save.isPending ? 'Guardando...' : 'Guardar fallback'}
          </Button>
        ) : null}
      </div>

      {!isAdmin ? (
        <div className="space-y-4">
          <Alert>
            <Lock weight="duotone" />
            <AlertTitle>Configuracion global de plataforma</AlertTitle>
            <AlertDescription>
              En esta fase el fallback editable es administrado por plataforma. La
              configuracion personal de modelos esta disponible en Modelos de IA.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-3">
            {['Primario', 'Fallback 1', 'Fallback 2'].map((label, index) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {index === 0 ? 'Tu modelo asignado' : 'Respaldo de plataforma'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  GenOVA recorre la cadena automaticamente cuando hay errores o latencia.
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isAdmin && config.isError ? (
        <Alert variant="destructive">
          <Warning weight="duotone" />
          <AlertTitle>No se pudo cargar la cadena</AlertTitle>
          <AlertDescription>{config.error?.message || 'Intenta nuevamente.'}</AlertDescription>
        </Alert>
      ) : null}

      {isAdmin && (config.isLoading || !draft) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : null}

      {isAdmin && draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => (
            <LlmTaskRow
              key={task}
              task={task}
              value={draft[task]}
              models={catalog.data ?? []}
              disabled={!isAdmin || save.isPending}
              onChange={(next) => setDraft((current) => ({ ...current, [task]: next }))}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
