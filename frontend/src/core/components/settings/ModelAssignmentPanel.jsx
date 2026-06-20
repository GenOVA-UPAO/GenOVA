import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/core/components/ui/button'
import { ModelTaskCard } from '@/core/components/settings/ModelTaskCard.jsx'
import { LlmTaskRow } from '@/core/components/settings/LlmTaskRow.jsx'
import { CatalogStatusAlert } from '@/core/components/settings/CatalogStatusAlert.jsx'
import { TASK_LABELS } from '@/core/lib/llm/llmSettingsLabels.js'

export function ModelAssignmentPanel({ tasks, draft, setDraft, adminModels, adminHook, isAdmin, userHook }) {
  const [editTask, setEditTask] = useState(null)

  return (
    <div className="space-y-5">
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
            onUserFallback={(t, idx, p, m) => userHook.setFallback(t, idx, p, m)}
            onUserAddFallback={(t) => userHook.addFallback(t)}
            onUserRemoveFallback={(t, idx) => userHook.removeFallback(t, idx)}
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

      {userHook.hasOwnLlmKey && !isAdmin && (
        <div className="flex justify-end pt-1 border-t border-border/40">
          <Button size="sm" onClick={userHook.save} disabled={userHook.saving || userHook.loading} className="gap-1.5 shadow-md text-xs font-bold px-5 mt-3">
            {userHook.saving ? 'Guardando...' : 'Guardar mis asignaciones'}
          </Button>
        </div>
      )}
    </div>
  )
}
