import { Plus, Trash, X } from '@phosphor-icons/react'
import { LlmModelSelect } from '@/core/settings/components/LlmModelSelect.tsx'
import { Input } from '@/core/components/ui/input'

interface UserOverrideSectionProps {
  task: string
  chip: string
  num: string
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
  userDisabled: boolean
  bounds: number[]
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
}

function UserChip({
  f,
  i,
  models,
  chip,
  num,
  onRemove,
}: {
  f: { provider: string; model_id: string }
  i: number
  models: Array<{
    provider: string
    model_id: string
    label?: string
    modality?: string
  }>
  chip: string
  num: string
  onRemove: () => void
}) {
  const label =
    models.find((m) => m.provider === f.provider && m.model_id === f.model_id)
      ?.label ??
    f.model_id ??
    '—'
  const modality =
    models.find((m) => m.provider === f.provider && m.model_id === f.model_id)
      ?.modality || 'text'
  const MODALITY_SYMBOLS: Record<string, string> = {
    text: 'Aa',
    multimodal: '◆',
    image: '◇',
    audio: '♪',
  }
  return (
    <span className="inline-flex items-center gap-1">
      {i > 0 && (
        <span className="text-[8px] text-muted-foreground/30 font-black">
          →
        </span>
      )}
      <span
        className={`inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-semibold border ${chip}`}
      >
        <span className={`text-[9px] ${num}`}>
          {MODALITY_SYMBOLS[modality] || MODALITY_SYMBOLS.text}
        </span>
        <span className="truncate max-w-[70px]">{label}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${label}`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X size={10} weight="bold" aria-hidden="true" />
        </button>
      </span>
    </span>
  )
}

export function UserOverrideSection({
  task,
  chip,
  num,
  userSettings,
  userModels,
  userDisabled,
  bounds,
  onUserModel,
  onUserTimeout,
  onResetUser,
  onUserFallback,
  onUserAddFallback,
  onUserRemoveFallback,
}: UserOverrideSectionProps) {
  const userFallbacks = userSettings?.fallbacks ?? []
  return (
    <div className="space-y-2.5 pt-3 border-t border-dashed border-border/50">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/50">
          Tu modelo
        </p>
        <button
          type="button"
          onClick={onResetUser}
          disabled={userDisabled}
          className="text-[9px] font-semibold text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-30"
        >
          Restaurar
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <LlmModelSelect
            models={userModels}
            provider={userSettings?.provider}
            modelId={userSettings?.model_id}
            onChange={onUserModel}
            disabled={userDisabled}
            ariaLabel={`Mi modelo ${task}`}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            min={bounds[0]}
            max={bounds[1]}
            value={userSettings?.timeout_s ?? ''}
            disabled={userDisabled}
            onChange={(e) => onUserTimeout(Number(e.target.value))}
            className="h-8 w-14 text-center text-xs border-border/50 bg-background/60"
            title={`Timeout: ${bounds[0]}–${bounds[1]} s`}
          />
          <span className="text-[10px] text-muted-foreground/40">s</span>
        </div>
      </div>
      {userFallbacks.length > 0 ? (
        <div className="flex flex-wrap items-center gap-0.5">
          {userFallbacks.slice(0, 4).map((f, i) => (
            <UserChip
              key={i}
              f={f}
              i={i}
              models={userModels}
              chip={chip}
              num={num}
              onRemove={() => onUserRemoveFallback(task, i)}
            />
          ))}
          {userFallbacks.length > 4 && (
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50">
              +{userFallbacks.length - 4}
            </span>
          )}
        </div>
      ) : (
        <div className="text-[10px] italic text-muted-foreground/40">
          Sin cadena de respaldo personal
        </div>
      )}
      {userFallbacks.map((f, i) => {
        if (f.provider && f.model_id) return null
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground/50">
              #{i + 1}
            </span>
            <div className="flex-1">
              <LlmModelSelect
                models={userModels}
                provider={f.provider || undefined}
                modelId={f.model_id || undefined}
                onChange={(p, m) => onUserFallback(task, i, p, m)}
                disabled={userDisabled}
                ariaLabel={`Mi fallback ${i + 1} ${task}`}
              />
            </div>
            <button
              type="button"
              onClick={() => onUserRemoveFallback(task, i)}
              disabled={userDisabled}
              aria-label={`Quitar respaldo #${i + 1}`}
              className="p-1 rounded text-muted-foreground hover:text-destructive"
            >
              <Trash size={12} weight="duotone" aria-hidden="true" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => onUserAddFallback(task)}
        disabled={userDisabled}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/50 hover:text-primary transition-colors"
      >
        <Plus size={10} weight="bold" aria-hidden="true" />
        Añadir respaldo
      </button>
    </div>
  )
}
