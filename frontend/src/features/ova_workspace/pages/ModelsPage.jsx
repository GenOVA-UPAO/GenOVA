import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { ArrowsClockwise, Cpu, Robot, SlidersHorizontal } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { m as motion } from 'motion/react'
import { Button } from '@/core/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/components/ui/tabs'
import { useLlmSettings } from '@/core/hooks/useLlmSettings.js'
import { useAdminLlmConfig } from '@/features/admin/hooks/useAdminLlmConfig.js'
import { getCurrentUser } from '@/core/lib/me.js'
import { toDraft, toPayload } from '@/core/lib/llm/llmConfigDraft.js'
import { ModelAssignmentPanel } from '@/core/components/settings/ModelAssignmentPanel.jsx'
import { ApiKeysCard } from '@/core/components/settings/ApiKeysCard.jsx'
import { PlatformNodesCard } from '@/core/components/settings/PlatformNodesCard.jsx'
import { PlatformApiKeysCard } from '@/core/components/settings/PlatformApiKeysCard.jsx'
import { ManageModelsModal } from '@/core/components/settings/ManageModelsModal.jsx'

const AdminBadge = () => (
  <span className="ml-1 rounded-sm bg-amber-500/15 px-1 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
    Admin
  </span>
)

export function ModelsPage() {
  const [user, setUser] = useState(null)
  const [draft, setDraft] = useState(null)
  const [tabValue, setTabValue] = useState('tasks')
  const [manageOpen, setManageOpen] = useState(false)
  const userHook = useLlmSettings(true)
  const adminHook = useAdminLlmConfig()
  const isAdmin = user?.role === 'administrador'
  const canModels = !user || isAdmin || (user?.permissions || []).includes('ai:models:self') || (user?.permissions || []).includes('ai:models:platform')
  const baseTasks = adminHook.config.data?.tasks ?? ['texto', 'codigo', 'orquestador', 'razonamiento']
  const tasks = [...new Set([...baseTasks, 'imagen', 'video'])]
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

  if (!canModels) return <Navigate to="/dashboard" replace />

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

      <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-5">
        <TabsList className="bg-card border border-border/60 shadow-sm h-auto p-1 gap-0.5 rounded-xl w-fit flex-wrap">
          <TabsTrigger value="tasks" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            <SlidersHorizontal size={12} weight="bold" /> Asignación de Modelos
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
            API Keys
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="prometheus" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
              <Cpu size={12} weight="bold" /> Prometheus <AdminBadge />
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="platform-keys" className="rounded-lg px-4 py-2 text-xs font-bold gap-1.5 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
              <Robot size={12} weight="bold" /> Keys Globales <AdminBadge />
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tasks" className="mt-0">
          <ModelAssignmentPanel
            tasks={tasks} draft={draft} setDraft={setDraft}
            adminModels={adminModels} adminHook={adminHook}
            isAdmin={isAdmin} userHook={userHook}
            onOpenManageModels={() => setManageOpen(true)}
          />
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

      <ManageModelsModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        hook={userHook}
        onGoToApiKeys={() => { setManageOpen(false); setTabValue('apikeys') }}
      />
    </motion.div>
  )
}
