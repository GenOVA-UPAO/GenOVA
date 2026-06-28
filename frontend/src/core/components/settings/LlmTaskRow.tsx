import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react'
import { LlmModelSelect } from '@/core/components/settings/LlmModelSelect.tsx'
import { Button } from '@/core/components/ui/button'
import {
  addFallback as addFb,
  type Entry,
  moveFallback,
  removeFallback as removeFb,
  setFallback as setFb,
} from '@/core/lib/llm/llmConfigDraft'

interface LlmTaskRowProps {
  task: string
  value: { default?: Entry; fallbacks?: Entry[] }
  models: Array<{
    provider: string
    model_id: string
    label?: string
    modality?: string
    context_length?: number
    pricing?: string
  }>
  disabled?: boolean
  onChange: (next: { default?: Entry; fallbacks?: Entry[] }) => void
}

const TASK_LABELS: Record<string, string> = {
  texto: 'Texto (Generación OVA)',
  codigo: 'Código (HTML)',
  orquestador: 'Orquestador (Planificación)',
  razonamiento: 'Razonamiento',
}

const TASK_DESCS: Record<string, string> = {
  texto:
    'Modelo principal utilizado para generar el contenido de los recursos educativos.',
  codigo:
    'Especializado en generar estructuras HTML y recursos interactivos SCORM.',
  orquestador:
    'Coordina los agentes secundarios para la generación paso a paso.',
  razonamiento:
    'Se utiliza para evaluaciones complejas o toma de decisiones semánticas.',
}

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 transition-colors shadow-sm bg-card/50 backdrop-blur-sm"
    >
      {children}
    </button>
  )
}

export function LlmTaskRow({
  task,
  value,
  models,
  disabled,
  onChange,
}: LlmTaskRowProps) {
  const fallbacks = value.fallbacks ?? []

  const setDefault = (provider: string, modelId: string) =>
    onChange({
      ...value,
      default: { ...value.default, provider, model_id: modelId },
    })

  const setFallback = (i: number, provider: string, modelId: string) =>
    onChange({ ...value, fallbacks: setFb(fallbacks, i, provider, modelId) })

  const addFallback = () => onChange({ ...value, fallbacks: addFb(fallbacks) })

  const removeFallback = (i: number) =>
    onChange({ ...value, fallbacks: removeFb(fallbacks, i) })

  const move = (i: number, dir: number) =>
    onChange({ ...value, fallbacks: moveFallback(fallbacks, i, dir) })

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden glass-card shadow-sm hover:border-primary/20 transition">
      <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground font-display">
              {TASK_LABELS[task] ?? task}
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 leading-snug">
              {TASK_DESCS[task] ?? 'Configuración de modelos de IA'}
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary border border-primary/20 uppercase tracking-widest self-start">
            {fallbacks.length} fallback{fallbacks.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="block space-y-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20 tracking-widest uppercase">
              Primario
            </span>
            <span className="text-xs font-bold text-foreground">
              Modelo principal
            </span>
          </div>
          <LlmModelSelect
            models={models}
            provider={value.default?.provider}
            modelId={value.default?.model_id}
            onChange={setDefault}
            disabled={disabled}
            ariaLabel={`Modelo primario de ${task}`}
          />
        </div>

        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Cadena de fallback
          </span>
          {fallbacks.length === 0 && (
            <p className="text-xs font-medium text-muted-foreground/80 bg-muted/30 p-4 rounded-2xl border border-border/50 text-center italic">
              No hay modelos de respaldo configurados. Si el primario falla, se
              detendrá la tarea.
            </p>
          )}
          {fallbacks.map((f, i) => {
            const fbModel = models.find(
              (m) => m.provider === f.provider && m.model_id === f.model_id,
            )
            const modality = fbModel?.modality || 'text'
            const MODALITY_SYMBOLS: Record<string, string> = {
              text: 'Aa',
              multimodal: '◆',
              image: '◇',
              audio: '♪',
            }
            return (
              <div
                key={i}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border ${disabled ? 'border-border/50 bg-muted/20' : 'border-border bg-card/50 hover:bg-accent/30'} transition shadow-sm`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted px-2 py-1 rounded-md border border-border">
                    #{i + 1}
                  </span>
                  {modality !== 'text' && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">
                      {MODALITY_SYMBOLS[modality]}
                    </span>
                  )}
                  {i > 0 && (
                    <span className="hidden sm:inline text-[10px] text-muted-foreground/30 font-black">
                      ←
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <LlmModelSelect
                    models={models}
                    provider={f.provider}
                    modelId={f.model_id}
                    onChange={(p, m) => setFallback(i, p, m)}
                    disabled={disabled}
                    ariaLabel={`Fallback ${i + 1} de ${task}`}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 shrink-0 sm:ml-2">
                  <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted px-2 py-1 rounded-md border border-border sm:hidden mr-auto">
                    #{i + 1}
                  </span>
                  <IconBtn
                    title="Subir"
                    onClick={() => move(i, -1)}
                    disabled={disabled || i === 0}
                  >
                    <ArrowUp size={16} weight="bold" />
                  </IconBtn>
                  <IconBtn
                    title="Bajar"
                    onClick={() => move(i, 1)}
                    disabled={disabled || i === fallbacks.length - 1}
                  >
                    <ArrowDown size={16} weight="bold" />
                  </IconBtn>
                  <button
                    type="button"
                    title="Quitar"
                    onClick={() => removeFallback(i)}
                    disabled={disabled}
                    className="p-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors shadow-sm ml-1 bg-destructive/5"
                  >
                    <Trash size={16} weight="duotone" />
                  </button>
                </div>
              </div>
            )
          })}
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addFallback}
              disabled={disabled}
              className="w-full text-xs font-bold shadow-sm border-dashed rounded-xl py-5 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition"
            >
              <Plus size={16} weight="bold" className="mr-2" /> Añadir modelo de
              respaldo
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
