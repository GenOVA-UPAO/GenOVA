import { useEffect, useState } from 'react'
import { ArrowsClockwise, Cpu, GridFour, Key, Robot, SlidersHorizontal } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLlmSettings } from '../hooks/useLlmSettings.js'
import { useAdminLlmConfig } from '../hooks/admin/useAdminLlmConfig.js'
import { getCurrentUser } from '../lib/me.js'
import { toDraft, toPayload } from '../lib/llmConfigDraft.js'
import { ModelAssignmentPanel } from '../components/settings/ModelAssignmentPanel.jsx'
import { ModelCatalogBrowser } from '../components/settings/ModelCatalogBrowser.jsx'
import { ApiKeysCard } from '../components/settings/ApiKeysCard.jsx'
import { PlatformNodesCard } from '../components/settings/PlatformNodesCard.jsx'
import { PlatformApiKeysCard } from '../components/settings/PlatformApiKeysCard.jsx'

export function ModelsPage() {
  const [user, setUser] = useState(null)
  const [draft, setDraft] = useState(null)
  const userHook = useLlmSettings(true)
  const adminHook = useAdminLlmConfig()
  const isAdmin = user?.role === 'administrador'
  const tasks = adminHook.config.data?.tasks ?? ['texto', 'codigo', 'orquestador', 'razonamiento', 'imagen', 'video']
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/[.04] blur-2xl pointer-events-none" />
        <div className="absolute right-16 bottom-0 h-24 w-24 rounded-full bg-accent-brand/[.04] blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 w-fit mb-1.5">
              <SlidersHorizontal size={9} weight="bold" className="text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary">Configuración</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">Modelos de IA</h1>
            <p className="text-sm text-muted-foreground font-medium max-w-sm">
              Modelo primario, cadena de fallback y API keys por proveedor.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={handleAdminSave} disabled={!draft || adminHook.save.isPending} className="gap-1.5 shadow-md text-xs font-bold shrink-0">
              <ArrowsClockwise size={13} weight="bold" className={adminHook.save.isPending ? 'animate-spin' : ''} />
              {adminHook.save.isPending ? 'Guardando...' : 'Guardar plataforma'}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-5">
        <TabsList className="bg-card border border-border/60 shadow-sm h-auto p-1 gap-0.5 rounded-xl w-fit flex-wrap">
          <TabsTrigger value="tasks" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            <SlidersHorizontal size={12} weight="bold" /> Asignación
          </TabsTrigger>
          <TabsTrigger value="catalog" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            <GridFour size={12} weight="bold" /> Catálogo
            {userHook.catalogFull.length > 0 && (
              <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px] font-black leading-none">{userHook.catalogFull.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            <Key size={12} weight="bold" /> API Keys
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="prometheus" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
              <Cpu size={12} weight="bold" /> Prometheus
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="platform-keys" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
              <Robot size={12} weight="bold" /> Keys Globales
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="mt-0">
          <ModelAssignmentPanel
            tasks={tasks} draft={draft} setDraft={setDraft}
            adminModels={adminModels} adminHook={adminHook}
            isAdmin={isAdmin} userHook={userHook}
          />
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
                  Añade una API key en la pestaña <span className="font-bold text-primary">API Keys</span> para explorar y habilitar modelos adicionales.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="apikeys" className="mt-0">
          <ApiKeysCard />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="prometheus" className="mt-0">
            <PlatformNodesCard />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="platform-keys" className="mt-0">
            <PlatformApiKeysCard />
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  )
}
