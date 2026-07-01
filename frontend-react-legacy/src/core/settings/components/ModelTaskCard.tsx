import { PencilSimple } from '@phosphor-icons/react'
import { m as motion } from 'motion/react'
import { LlmModelSelect } from '@/core/settings/components/LlmModelSelect.tsx'
import { Chips } from '@/core/settings/components/ModelTaskCardChips.tsx'
import { UserOverrideSection } from '@/core/settings/components/UserOverrideSection.tsx'
import { TASK_META, type TaskType } from '@/core/settings/lib/taskMeta'

interface ModelTaskCardProps {
  task: string
  index?: number
  adminDraft?: {
    default?: { provider: string; model_id: string }
    fallbacks?: Array<{ provider: string; model_id: string }>
  }
  adminModels: Array<{
    provider: string
    model_id: string
    label?: string
    modality?: string
  }>
  isAdmin: boolean
  adminDisabled: boolean
  onAdminChange: (next: {
    default?: { provider: string; model_id: string }
    fallbacks?: Array<{ provider: string; model_id: string }>
  }) => void
  isEditing: boolean
  onEditChain: () => void
  userSettings?: {
    provider?: string
    model_id?: string
    timeout_s?: number
    fallbacks?: Array<{ provider: string; model_id: string }>
  }
  userModels: Array<{
    provider: string
    model_id: string
    label?: string
    modality?: string
  }>
  hasOwnLlmKey: boolean
  userDisabled: boolean
  onUserModel: (provider: string, modelId: string) => void
  onUserTimeout: (timeout: number) => void
  onResetUser: () => void
  onUserFallback: (
    task: string,
    idx: number,
    provider: string,
    modelId: string,
  ) => void
  onUserAddFallback: (task: string) => void
  onUserRemoveFallback: (task: string, idx: number) => void
  bounds: number[]
}

export function ModelTaskCard({
  task,
  index = 0,
  adminDraft,
  adminModels,
  isAdmin,
  adminDisabled,
  onAdminChange,
  isEditing,
  onEditChain,
  userSettings,
  userModels,
  hasOwnLlmKey,
  userDisabled,
  onUserModel,
  onUserTimeout,
  onResetUser,
  onUserFallback,
  onUserAddFallback,
  onUserRemoveFallback,
  bounds = [30, 300],
}: ModelTaskCardProps) {
  const m = TASK_META[task as TaskType] ?? {
    label: task,
    desc: '',
    Icon: () => null,
    grad: 'from-border/10 to-transparent',
    accent: 'text-muted-foreground',
    iconBg: 'bg-muted border-border',
    badge: 'bg-muted text-muted-foreground border-border',
    chip: 'bg-muted text-muted-foreground border-border',
    num: 'text-muted-foreground',
  }
  const fallbacks = adminDraft?.fallbacks ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.07,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md hover:border-border transition duration-200"
    >
      <div
        className={`bg-gradient-to-br ${m.grad} px-5 pt-4 pb-3.5 border-b border-border/40`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`shrink-0 rounded-xl border p-2.5 shadow-sm ${m.iconBg}`}
            >
              <m.Icon size={18} weight="duotone" className={m.accent} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">
                {m.label}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-medium truncate">
                {m.desc}
              </p>
            </div>
          </div>
          {fallbacks.length > 0 && (
            <span
              className={`shrink-0 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${m.badge}`}
            >
              {fallbacks.length} fb
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/50">
            Plataforma UPAO
          </p>
          {isAdmin ? (
            <>
              <LlmModelSelect
                models={adminModels}
                provider={adminDraft?.default?.provider}
                modelId={adminDraft?.default?.model_id}
                onChange={(p, mm) =>
                  onAdminChange({
                    ...adminDraft,
                    default: { provider: p, model_id: mm },
                  })
                }
                disabled={adminDisabled}
                ariaLabel={`Plataforma primario ${task}`}
              />
              <Chips
                fallbacks={fallbacks}
                models={adminModels}
                chip={m.chip}
                num={m.num}
              />
              <button
                type="button"
                onClick={onEditChain}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold transition duration-150 ${isEditing ? `${m.accent} bg-current/5 ring-1 ring-current/20` : 'text-muted-foreground/50 hover:text-primary hover:bg-primary/5'}`}
              >
                <PencilSimple size={10} weight="bold" />
                {isEditing ? 'Editando cadena ✓' : 'Editar cadena de fallback'}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-muted/40 border border-border/40 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Administrado por la plataforma UPAO
                </p>
              </div>
              <Chips
                fallbacks={fallbacks}
                models={adminModels}
                chip={m.chip}
                num={m.num}
              />
            </>
          )}
        </div>

        {hasOwnLlmKey && !isAdmin && (
          <UserOverrideSection
            task={task}
            chip={m.chip}
            num={m.num}
            userSettings={userSettings}
            userModels={userModels}
            userDisabled={userDisabled}
            bounds={bounds}
            onUserModel={onUserModel}
            onUserTimeout={onUserTimeout}
            onResetUser={onResetUser}
            onUserFallback={onUserFallback}
            onUserAddFallback={onUserAddFallback}
            onUserRemoveFallback={onUserRemoveFallback}
          />
        )}
      </div>
    </motion.div>
  )
}
