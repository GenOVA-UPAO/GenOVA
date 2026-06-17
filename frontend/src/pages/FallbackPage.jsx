import { useEffect, useState } from 'react'
import { ArrowsClockwise, Lock, Warning, ListDashes } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
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
      onSuccess: () => toast.success('Cadena de fallback guardada exitosamente.'),
      onError: (e) => toast.error(e.message || 'No se pudo guardar la configuración.'),
    })
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-6 pb-10"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl flex items-center gap-3">
            <ListDashes className="text-primary" weight="duotone" />
            Cadena de Fallback
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium text-muted-foreground">
            Orden de prioridad de modelos de IA por cada caso de uso en la plataforma.
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={handleSave} disabled={!draft || save.isPending} className="self-start gap-2 shadow-md hover:shadow-lg transition-all">
            <ArrowsClockwise size={18} weight="bold" className={save.isPending ? "animate-spin" : ""} />
            {save.isPending ? 'Guardando cambios...' : 'Guardar configuración'}
          </Button>
        ) : null}
      </div>

      {!isAdmin ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-200/50 bg-blue-50/50 p-5 flex items-start gap-4 glass-card shadow-sm">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 mt-0.5">
              <Lock size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Visualizando cadena de Plataforma UPAO (solo lectura)</p>
              <p className="text-xs font-medium text-blue-800/80 mt-1">
                El orden de modelos de respaldo general es administrado por plataforma. Puedes agregar tu propia API Key en 'Modelos de IA' para priorizar tus preferencias.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {['Primario', 'Fallback 1', 'Fallback 2'].map((label, index) => (
              <div key={label} className="rounded-2xl border-2 border-border/40 bg-card p-5 glass-card shadow-sm hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-amber-400' : 'bg-muted-foreground'}`} />
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {index === 0 ? 'Tu modelo asignado' : 'Respaldo de plataforma'}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                  GenOVA recorre la cadena automáticamente cuando hay errores o latencia excesiva.
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {isAdmin && config.isError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Alert variant="destructive" className="glass-card bg-destructive/5 border-destructive/20 rounded-2xl">
              <Warning size={20} weight="duotone" />
              <AlertTitle className="font-bold">No se pudo cargar la cadena</AlertTitle>
              <AlertDescription className="font-medium text-destructive/80">
                {config.error?.message || 'Hubo un error de conexión. Intenta actualizar la página.'}
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isAdmin && (config.isLoading || !draft) ? (
        <div className="grid gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted/30 border border-border/40" />
          ))}
        </div>
      ) : null}

      {isAdmin && draft ? (
        <div className="grid gap-6">
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
    </motion.section>
  )
}
