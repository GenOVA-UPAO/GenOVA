import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowsClockwise, GridFour, Image, Key, SlidersHorizontal, X } from '@phosphor-icons/react'
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
import { getOvaSettings } from '../services/ovaSettingsService.js'
const IMG_LABEL = { huggingface: 'HuggingFace', siliconflow: 'SiliconFlow', runware: 'Runware', falai: 'fal.ai' }

export function ModelsPage() {
  const [user, setUser] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [imageProvider, setImageProvider] = useState('huggingface')
  const [maxImages, setMaxImages] = useState(2)
  const userHook = useLlmSettings(true)
  const adminHook = useAdminLlmConfig()
  const isAdmin = user?.role === 'administrador'
  const tasks = adminHook.config.data?.tasks ?? ['texto', 'codigo', 'orquestador', 'razonamiento']
  const adminModels = adminHook.catalog.data ?? []
  useEffect(() => { getCurrentUser().then(setUser) }, [])
  useEffect(() => {
    getOvaSettings()
      .then(({ settings }) => {
        setImageProvider(settings?.image_provider ?? 'huggingface')
        setMaxImages(settings?.max_images ?? 2)
      })
      .catch(() => {})
  }, [])
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/[.04] blur-2xl pointer-events-none" />
        <div className="absolute right-16 bottom-0 h-24 w-24 rounded-full bg-accent-brand/[.04] blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5">
                <SlidersHorizontal size={9} weight="bold" className="text-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary">Configuración</span>
              </div>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
              Modelos de IA
            </h1>
            <p className="text-sm text-muted-foreground font-medium max-w-sm">
              Modelo primario, cadena de fallback y override personal.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 dark:bg-pink-950/30 dark:border-pink-800 px-2.5 py-1 text-[10px] font-semibold text-pink-600">
                <Image size={12} weight="duotone" />{IMG_LABEL[imageProvider] || imageProvider}</span>
              <span className="text-[10px] text-muted-foreground/60">{maxImages === 0 ? 'Sin imágenes' : `${maxImages} img / OVA`}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-primary/25 hover:bg-primary/5 text-primary text-xs font-bold">
              <Link to="/profile"><Key size={13} weight="duotone" /> API Keys</Link>
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={handleAdminSave} disabled={!draft || adminHook.save.isPending} className="gap-1.5 shadow-md text-xs font-bold">
                <ArrowsClockwise size={13} weight="bold" className={adminHook.save.isPending ? 'animate-spin' : ''} />
                {adminHook.save.isPending ? 'Guardando...' : 'Guardar plataforma'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-5">
        <TabsList className="bg-card border border-border/60 shadow-sm h-auto p-1 gap-0.5 rounded-xl w-fit">
          <TabsTrigger
            value="tasks"
            className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
          >
            <SlidersHorizontal size={12} weight="bold" /> Asignación
          </TabsTrigger>
          <TabsTrigger
            value="catalog"
            className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
          >
            <GridFour size={12} weight="bold" /> Catálogo
            {userHook.catalogFull.length > 0 && (
              <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px] font-black leading-none">
                {userHook.catalogFull.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-5 mt-0">
          <CatalogStatusAlert catalogStatus={userHook.catalogStatus} refreshing={userHook.refreshingCatalog} onRetry={userHook.retryRefresh} />

          <div className="grid gap-4 sm:grid-cols-2">
            {tasks.map((task, i) => (
              <ModelTaskCard
                key={task} task={task} index={i}
                adminDraft={draft?.[task]} adminModels={adminModels}
                isAdmin={isAdmin} adminDisabled={!isAdmin || adminHook.save.isPending}
                onAdminChange={(next) => setDraft((d) => ({ ...d, [task]: next }))}
                isEditing={editTask === task}
                onEditChain={() => setEditTask((prev) => (prev === task ? null : task))}
                userSettings={userHook.settings?.[task]} userModels={userHook.catalogFull}
                hasOwnLlmKey={userHook.hasOwnLlmKey} userDisabled={userHook.saving}
                onUserModel={(p, mm) => userHook.setModel(task, p, mm)}
                onUserTimeout={(t) => userHook.setTipoTimeout(task, t)}
                onResetUser={() => userHook.resetTipo(task)}
                onUserFallback={(t, i, p, m) => userHook.setFallback(t, i, p, m)}
                onUserAddFallback={(t) => userHook.addFallback(t)}
                onUserRemoveFallback={(t, i) => userHook.removeFallback(t, i)}
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
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-primary/25 bg-primary/[.025] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        Cadena de fallback — <span className="text-primary">{TASK_LABELS[editTask] ?? editTask}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTask(null)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X size={13} weight="bold" />
                    </button>
                  </div>
                  <LlmTaskRow
                    task={editTask} value={draft[editTask]} models={adminModels}
                    disabled={adminHook.save.isPending}
                    onChange={(next) => setDraft((d) => ({ ...d, [editTask]: next }))}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {userHook.hasOwnLlmKey && (
            <div className="flex justify-end pt-1 border-t border-border/40">
              <Button size="sm" onClick={userHook.save} disabled={userHook.saving || userHook.loading} className="gap-1.5 shadow-md text-xs font-bold px-5 mt-3">
                {userHook.saving ? 'Guardando...' : 'Guardar mis asignaciones'}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-0">
          {userHook.hasOwnLlmKey ? (
            <ModelCatalogBrowser hook={userHook} />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 p-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <GridFour size={22} weight="duotone" className="text-muted-foreground" />
              </div>
              <div className="max-w-xs space-y-1.5">
                <p className="text-sm font-bold text-foreground font-display">Catálogo bloqueado</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Añade una API key en{' '}
                  <Link to="/profile" className="font-bold text-primary hover:underline">Mi Perfil</Link>
                  {' '}para explorar y habilitar modelos adicionales.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
