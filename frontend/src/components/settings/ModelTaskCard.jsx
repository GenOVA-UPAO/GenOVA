import { Article, Brain, Code, PencilSimple, Robot } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { LlmModelSelect } from './LlmModelSelect.jsx'

const TASK_META = {
  texto:        { label: 'Texto',         Icon: Article, bar: 'bg-primary'        },
  codigo:       { label: 'Código / HTML', Icon: Code,    bar: 'bg-accent-brand'   },
  orquestador:  { label: 'Orquestador',   Icon: Robot,   bar: 'bg-primary/60'     },
  razonamiento: { label: 'Razonamiento',  Icon: Brain,   bar: 'bg-accent-brand/60'},
}

function FallbackChips({ fallbacks, models }) {
  if (!fallbacks?.length) {
    return <span className="text-[10px] text-muted-foreground/50 italic">Sin fallbacks</span>
  }
  const getLabel = (f) => {
    const found = models.find((m) => m.provider === f.provider && m.model_id === f.model_id)
    return found?.label ?? f.model_id ?? '—'
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {fallbacks.slice(0, 3).map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
          <span className="font-bold text-primary/50">#{i + 1}</span> {getLabel(f)}
        </span>
      ))}
      {fallbacks.length > 3 && (
        <span className="inline-flex items-center rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/40">
          +{fallbacks.length - 3} más
        </span>
      )}
    </div>
  )
}

export function ModelTaskCard({
  task,
  adminDraft, adminModels, isAdmin, adminDisabled, onAdminChange,
  isEditing, onEditChain,
  userSettings, userModels, hasOwnLlmKey, userDisabled, onUserModel, onUserTimeout, onResetUser,
  bounds = [30, 300],
}) {
  const { label, Icon, bar } = TASK_META[task] ?? { label: task, Icon: Robot, bar: 'bg-border' }
  const fallbacks = adminDraft?.fallbacks ?? []

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card glass-card shadow-sm hover:border-primary/20 transition-all">
      <div className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="pl-5 pr-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon size={13} weight="duotone" className="text-muted-foreground shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          {fallbacks.length > 0 && (
            <span className="ml-auto text-[9px] font-bold text-primary/70 bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
              {fallbacks.length} fb
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Plataforma</span>
          {isAdmin ? (
            <>
              <LlmModelSelect
                models={adminModels}
                provider={adminDraft?.default?.provider}
                modelId={adminDraft?.default?.model_id}
                onChange={(p, m) => onAdminChange({ ...adminDraft, default: { provider: p, model_id: m } })}
                disabled={adminDisabled}
                ariaLabel={`Plataforma primario ${task}`}
              />
              <FallbackChips fallbacks={fallbacks} models={adminModels} />
              <button
                type="button"
                onClick={onEditChain}
                className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 transition-colors ${isEditing ? 'text-primary font-bold' : 'text-muted-foreground/60 hover:text-primary'}`}
              >
                <PencilSimple size={10} weight="bold" />
                {isEditing ? 'Editando cadena ✓' : 'Editar cadena de fallback'}
              </button>
            </>
          ) : (
            <div className="rounded-lg bg-muted/30 border border-border/50 px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground">Administrado por la plataforma UPAO</p>
            </div>
          )}
        </div>

        {hasOwnLlmKey && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Mi override</span>
              <button
                type="button"
                onClick={onResetUser}
                disabled={userDisabled}
                className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors disabled:opacity-30"
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
              <Input
                type="number"
                min={bounds[0]}
                max={bounds[1]}
                value={userSettings?.timeout_s ?? ''}
                disabled={userDisabled}
                onChange={(e) => onUserTimeout(Number(e.target.value))}
                className="h-8 w-14 text-center text-xs border-border/50 bg-background/70 shrink-0"
                title={`Timeout: ${bounds[0]}–${bounds[1]} s`}
              />
              <span className="text-[10px] text-muted-foreground/40 shrink-0">s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
