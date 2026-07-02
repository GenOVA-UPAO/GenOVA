import { SlidersHorizontal, X } from '@phosphor-icons/react'
import { AnimatePresence, m as motion } from 'motion/react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { CatalogStatusAlert } from '@/core/settings/components/CatalogStatusAlert.tsx'
import { LlmTaskRow } from '@/core/settings/components/LlmTaskRow.tsx'
import { MediaTaskCard } from '@/core/settings/components/MediaTaskCard.tsx'
import { ModelTaskCard } from '@/core/settings/components/ModelTaskCard.tsx'
import { Button } from '@/core/components/ui/button'
import type { useLlmSettings } from '@/core/settings/hooks/useLlmSettings'
import type { Draft } from '@/core/settings/lib/llmConfigDraft'
import { TASK_LABELS } from '@/core/settings/lib/llmSettingsLabels'

export interface AdminModel {
  provider: string
  model_id: string
  label?: string
  modality?: string
  context_length?: number
  pricing?: string
}

interface ModelAssignmentPanelProps {
  tasks: string[]
  draft: Draft | null
  setDraft: Dispatch<SetStateAction<Draft | null>>
  adminModels: AdminModel[]
  adminHook: { save: { isPending: boolean } }
  isAdmin: boolean
  userHook: ReturnType<typeof useLlmSettings>
  onOpenManageModels?: () => void
}

export function ModelAssignmentPanel({
  tasks,
  draft,
  setDraft,
  adminModels,
  adminHook,
  isAdmin,
  userHook,
  onOpenManageModels,
}: ModelAssignmentPanelProps) {
  const [editTask, setEditTask] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <CatalogStatusAlert
            catalogStatus={userHook.catalogStatus}
            refreshing={userHook.refreshingCatalog}
            onRetry={userHook.retryRefresh}
          />
        </div>
        {onOpenManageModels && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenManageModels}
            className="shrink-0 gap-1.5 text-xs font-bold mt-0.5"
          >
            <SlidersHorizontal size={12} weight="bold" /> Configurar modelos
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tasks.map((task, i) =>
          task === 'imagen' || task === 'video' ? (
            <MediaTaskCard key={task} task={task} index={i} />
          ) : (
            <ModelTaskCard
              key={task}
              task={task}
              index={i}
              adminDraft={
                draft?.[task] as
                  | {
                      default?: { provider: string; model_id: string }
                      fallbacks?: Array<{ provider: string; model_id: string }>
                    }
                  | undefined
              }
              adminModels={adminModels}
              isAdmin={isAdmin}
              adminDisabled={!isAdmin || adminHook.save.isPending}
              onAdminChange={(next) =>
                setDraft((d) => ({ ...(d ?? {}), [task]: next }) as Draft)
              }
              isEditing={editTask === task}
              onEditChain={() =>
                setEditTask((prev) => (prev === task ? null : task))
              }
              userSettings={
                userHook.settings?.[task] as
                  | {
                      provider?: string
                      model_id?: string
                      timeout_s?: number
                      fallbacks?: Array<{ provider: string; model_id: string }>
                    }
                  | undefined
              }
              userModels={
                userHook.catalogEnabled as Array<{
                  provider: string
                  model_id: string
                  label?: string
                  modality?: string
                }>
              }
              hasOwnLlmKey={userHook.hasOwnLlmKey}
              userDisabled={userHook.saving}
              onUserModel={(p, mm) => userHook.setModel(task, p, mm)}
              onUserTimeout={(t) => userHook.setTipoTimeout(task, t)}
              onResetUser={() => userHook.resetTipo(task)}
              onUserFallback={(t, idx, p, m) =>
                userHook.setFallback(t, idx, p, m)
              }
              onUserAddFallback={(t) => userHook.addFallback(t)}
              onUserRemoveFallback={(t, idx) => userHook.removeFallback(t, idx)}
              bounds={userHook.bounds}
            />
          ),
        )}
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
                    Cadena de fallback —{' '}
                    <span className="text-primary">
                      {TASK_LABELS[editTask] ?? editTask}
                    </span>
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
                task={editTask}
                value={
                  draft[editTask] as {
                    default?: { provider: string; model_id: string }
                    fallbacks?: Array<{ provider: string; model_id: string }>
                  }
                }
                models={adminModels}
                disabled={adminHook.save.isPending}
                onChange={(next) =>
                  setDraft((d) => ({ ...(d ?? {}), [editTask]: next }) as Draft)
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {userHook.hasOwnLlmKey && !isAdmin && (
        <div className="flex justify-end pt-1 border-t border-border/40">
          <Button
            size="sm"
            onClick={userHook.save}
            disabled={userHook.saving || userHook.loading}
            className="gap-1.5 shadow-md text-xs font-bold px-5 mt-3"
          >
            {userHook.saving ? 'Guardando...' : 'Guardar mis asignaciones'}
          </Button>
        </div>
      )}
    </div>
  )
}
