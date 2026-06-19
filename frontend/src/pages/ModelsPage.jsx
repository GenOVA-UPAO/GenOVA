import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowsClockwise, GridFour, Key, SlidersHorizontal, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLlmSettings } from '../hooks/useLlmSettings.js'
import { useAdminLlmConfig } from '../hooks/admin/useAdminLlmConfig.js'
import { getCurrentUser } from '../lib/me.js'
import { toDraft, toPayload } from '../lib/llmConfigDraft.js'
import { TASK_LABELS } from '../lib/llmSettingsLabels.js'
import { ModelTaskCard } from '../components/settings/ModelTaskCard.jsx'
import { LlmTaskRow } from '../components/settings/LlmTaskRow.jsx'
import { ModelCatalogBrowser } from '../components/settings/ModelCatalogBrowser.jsx'
import { CatalogStatusAlert } from '../components/settings/CatalogStatusAlert.jsx'

export function ModelsPage() {
  const [user, setUser] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const userHook = useLlmSettings(true)
  const adminHook = useAdminLlmConfig()
  const isAdmin = user?.role === 'administrador'
  const tasks = adminHook.config.data?.tasks ?? ['texto', 'codigo', 'orquestador', 'razonamiento']
  const adminModels = adminHook.catalog.data ?? []

  useEffect(() => { getCurrentUser().then(setUser) }, [])

  useEffect(() => {
    if (adminHook.config.data) {
      setDraft(toDraft(adminHook.config.data.config, adminHook.config.data.tasks ?? []))
    }
  }, [adminHook.config.data])

  const handleAdminSave = () => {
    if (!draft) return
    adminHook.save.mutate(toPayload(draft, tasks), {
      onSuccess: () => toast.success('Configuración de plataforma guardada.'),
      onError: (e) => toast.error(e.message || 'No se pudo guardar.'),
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
            <SlidersHorizontal className="text-primary" weight="duotone" />
            Modelos de IA
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Asigna modelos por tarea, configura fallbacks y explora el catálogo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Button asChild variant="outline" size="sm" className="gap-1.5 border-primary/20 hover:bg-primary/5 text-primary">
            <Link to="/profile"><Key size={14} weight="duotone" /> API Keys</Link>
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={handleAdminSave} disabled={!draft || adminHook.save.isPending} className="gap-1.5 shadow-md">
              <ArrowsClockwise size={14} weight="bold" className={adminHook.save.isPending ? 'animate-spin' : ''} />
              {adminHook.save.isPending ? 'Guardando...' : 'Guardar plataforma'}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="bg-muted/30 p-1 rounded-xl glass-card border border-border/50">
          <TabsTrigger value="tasks" className="rounded-lg font-bold text-xs gap-1.5">
            <SlidersHorizontal size={13} weight="bold" /> Asignación por tarea
          </TabsTrigger>
          <TabsTrigger value="catalog" className="rounded-lg font-bold text-xs gap-1.5">
            <GridFour size={13} weight="bold" /> Catálogo
            {userHook.catalogFull.length > 0 && (
              <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[9px]">{userHook.catalogFull.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4 mt-0">
          <CatalogStatusAlert catalogStatus={userHook.catalogStatus} refreshing={userHook.refreshingCatalog} onRetry={userHook.retryRefresh} />
          <div className="grid gap-3 sm:grid-cols-2">
            {tasks.map((task) => (
              <ModelTaskCard
                key={task}
                task={task}
                adminDraft={draft?.[task]}
                adminModels={adminModels}
                isAdmin={isAdmin}
                adminDisabled={!isAdmin || adminHook.save.isPending}
                onAdminChange={(next) => setDraft((d) => ({ ...d, [task]: next }))}
                isEditing={editTask === task}
                onEditChain={() => setEditTask((prev) => (prev === task ? null : task))}
                userSettings={userHook.settings?.[task]}
                userModels={userHook.catalogFull}
                hasOwnLlmKey={userHook.hasOwnLlmKey}
                userDisabled={userHook.saving}
                onUserModel={(p, m) => userHook.setModel(task, p, m)}
                onUserTimeout={(t) => userHook.setTipoTimeout(task, t)}
                onResetUser={() => userHook.resetTipo(task)}
                bounds={userHook.bounds}
              />
            ))}
          </div>

          <AnimatePresence>
            {editTask && isAdmin && draft?.[editTask] && (
              <motion.div
                key={editTask}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3 border-t border-border/50 pt-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Cadena de fallback — {TASK_LABELS[editTask] ?? editTask}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditTask(null)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
                <LlmTaskRow
                  task={editTask}
                  value={draft[editTask]}
                  models={adminModels}
                  disabled={adminHook.save.isPending}
                  onChange={(next) => setDraft((d) => ({ ...d, [editTask]: next }))}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {userHook.hasOwnLlmKey && (
            <div className="flex justify-end border-t border-border/50 pt-3">
              <Button size="sm" onClick={userHook.save} disabled={userHook.saving || userHook.loading} className="gap-1.5 shadow-md">
                {userHook.saving ? 'Guardando...' : 'Guardar mis asignaciones'}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-0">
          {userHook.hasOwnLlmKey ? (
            <ModelCatalogBrowser hook={userHook} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <p className="text-sm font-bold text-foreground">Catálogo bloqueado</p>
              <p className="text-xs text-muted-foreground">
                Añade una API key en{' '}
                <Link to="/profile" className="font-semibold text-primary hover:underline">Mi Perfil</Link>
                {' '}para explorar modelos adicionales.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
