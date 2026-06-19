import { motion } from 'motion/react'
import { Article, Brain, Code, PencilSimple, Robot } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { LlmModelSelect } from './LlmModelSelect.jsx'

const TASK_META = {
  texto: {
    label: 'Texto', desc: 'Generación de contenido OVA', Icon: Article,
    grad: 'from-primary/[.07] to-primary/[.02]',
    accent: 'text-primary', iconBg: 'bg-primary/10 border-primary/20',
    badge: 'bg-primary/10 text-primary border-primary/25',
    chip: 'bg-primary/8 text-primary border-primary/20', num: 'text-primary font-black',
  },
  codigo: {
    label: 'Código / HTML', desc: 'HTML interactivo SCORM', Icon: Code,
    grad: 'from-accent-brand/[.07] to-accent-brand/[.02]',
    accent: 'text-accent-brand', iconBg: 'bg-accent-brand/10 border-accent-brand/20',
    badge: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
    chip: 'bg-accent-brand/8 text-accent-brand border-accent-brand/20', num: 'text-accent-brand font-black',
  },
  orquestador: {
    label: 'Orquestador', desc: 'Coordinación y planificación', Icon: Robot,
    grad: 'from-primary/[.05] to-primary/[.01]',
    accent: 'text-primary/70', iconBg: 'bg-primary/8 border-primary/15',
    badge: 'bg-primary/8 text-primary/70 border-primary/20',
    chip: 'bg-primary/6 text-primary/70 border-primary/15', num: 'text-primary/70 font-black',
  },
  razonamiento: {
    label: 'Razonamiento', desc: 'Evaluaciones semánticas', Icon: Brain,
    grad: 'from-accent-brand/[.05] to-accent-brand/[.01]',
    accent: 'text-accent-brand/70', iconBg: 'bg-accent-brand/8 border-accent-brand/15',
    badge: 'bg-accent-brand/8 text-accent-brand/70 border-accent-brand/20',
    chip: 'bg-accent-brand/6 text-accent-brand/70 border-accent-brand/15', num: 'text-accent-brand/70 font-black',
  },
}

function Chips({ fallbacks, models, chip, num }) {
  if (!fallbacks?.length) return (
    <div className="flex items-center gap-1.5 text-[10px] italic text-muted-foreground/40">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
      Sin cadena de respaldo
    </div>
  )
  const label = (f) => (models.find((m) => m.provider === f.provider && m.model_id === f.model_id)?.label ?? f.model_id ?? '—')
  const modality = (f) => (models.find((m) => m.provider === f.provider && m.model_id === f.model_id)?.modality) || 'text'
  const MODALITY_SYMBOLS = { text: 'Aa', multimodal: '◆', image: '◇', audio: '♪' }
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {fallbacks.slice(0, 4).map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[8px] text-muted-foreground/30 font-black">→</span>}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${chip}`}>
            <span className={`text-[9px] ${num}`}>
              {MODALITY_SYMBOLS[modality(f)] || MODALITY_SYMBOLS.text}
            </span>
            <span className="truncate max-w-[80px]">{label(f)}</span>
          </span>
        </span>
      ))}
      {fallbacks.length > 4 && (
        <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50">
          +{fallbacks.length - 4}
        </span>
      )}
    </div>
  )
}

export function ModelTaskCard({
  task, index = 0,
  adminDraft, adminModels, isAdmin, adminDisabled, onAdminChange,
  isEditing, onEditChain,
  userSettings, userModels, hasOwnLlmKey, userDisabled, onUserModel, onUserTimeout, onResetUser,
  bounds = [30, 300],
}) {
  const m = TASK_META[task] ?? { label: task, desc: '', Icon: Robot, grad: 'from-border/10 to-transparent', accent: 'text-muted-foreground', iconBg: 'bg-muted border-border', badge: 'bg-muted text-muted-foreground border-border', chip: 'bg-muted text-muted-foreground border-border', num: 'text-muted-foreground' }
  const fallbacks = adminDraft?.fallbacks ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200"
    >
      {/* Colored header band */}
      <div className={`bg-gradient-to-br ${m.grad} px-5 pt-4 pb-3.5 border-b border-border/40`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`shrink-0 rounded-xl border p-2.5 shadow-sm ${m.iconBg}`}>
              <m.Icon size={18} weight="duotone" className={m.accent} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">{m.label}</p>
              <p className="text-[10px] text-muted-foreground/70 font-medium truncate">{m.desc}</p>
            </div>
          </div>
          {fallbacks.length > 0 && (
            <span className={`shrink-0 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${m.badge}`}>
              {fallbacks.length} fb
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        <div className="space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/50">Plataforma UPAO</p>
          {isAdmin ? (
            <>
              <LlmModelSelect
                models={adminModels}
                provider={adminDraft?.default?.provider}
                modelId={adminDraft?.default?.model_id}
                onChange={(p, mm) => onAdminChange({ ...adminDraft, default: { provider: p, model_id: mm } })}
                disabled={adminDisabled}
                ariaLabel={`Plataforma primario ${task}`}
              />
              <Chips fallbacks={fallbacks} models={adminModels} chip={m.chip} num={m.num} />
              <button
                type="button"
                onClick={onEditChain}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold transition-all duration-150 ${isEditing ? `${m.accent} bg-current/5 ring-1 ring-current/20` : 'text-muted-foreground/50 hover:text-primary hover:bg-primary/5'}`}
              >
                <PencilSimple size={10} weight="bold" />
                {isEditing ? 'Editando cadena ✓' : 'Editar cadena de fallback'}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-muted/40 border border-border/40 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Administrado por la plataforma UPAO</p>
              </div>
              <Chips fallbacks={fallbacks} models={adminModels} chip={m.chip} num={m.num} />
            </>
          )}
        </div>

        {hasOwnLlmKey && (
          <div className="space-y-2.5 pt-3 border-t border-dashed border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/50">Tu override</p>
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
                  type="number" min={bounds[0]} max={bounds[1]}
                  value={userSettings?.timeout_s ?? ''}
                  disabled={userDisabled}
                  onChange={(e) => onUserTimeout(Number(e.target.value))}
                  className="h-8 w-14 text-center text-xs border-border/50 bg-background/60"
                  title={`Timeout: ${bounds[0]}–${bounds[1]} s`}
                />
                <span className="text-[10px] text-muted-foreground/40">s</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
