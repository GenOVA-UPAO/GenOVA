import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  addFallback as addFb,
  moveFallback,
  removeFallback as removeFb,
  setFallback as setFb,
} from '../../lib/llmConfigDraft.js'
import { LlmModelSelect } from './LlmModelSelect.jsx'

const TASK_LABELS = {
  texto: 'Texto',
  codigo: 'Código (HTML)',
  orquestador: 'Orquestador',
  razonamiento: 'Razonamiento',
}

function IconBtn({ title, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/**
 * Configura una tarea: modelo primario + cadena de fallback reordenable.
 * `value` = { default: {provider, model_id}, fallbacks: [{provider, model_id}] }.
 */
export function LlmTaskRow({ task, value, models, disabled, onChange }) {
  const fallbacks = value.fallbacks ?? []

  const setDefault = (provider, model_id) =>
    onChange({ ...value, default: { ...value.default, provider, model_id } })

  const setFallback = (i, provider, model_id) =>
    onChange({ ...value, fallbacks: setFb(fallbacks, i, provider, model_id) })

  const addFallback = () => onChange({ ...value, fallbacks: addFb(fallbacks) })

  const removeFallback = (i) => onChange({ ...value, fallbacks: removeFb(fallbacks, i) })

  const move = (i, dir) => onChange({ ...value, fallbacks: moveFallback(fallbacks, i, dir) })

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{TASK_LABELS[task] ?? task}</h3>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {fallbacks.length} fallback{fallbacks.length === 1 ? '' : 's'}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Modelo primario</span>
        <LlmModelSelect
          models={models}
          provider={value.default?.provider}
          modelId={value.default?.model_id}
          onChange={setDefault}
          disabled={disabled}
          ariaLabel={`Modelo primario de ${task}`}
        />
      </label>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Cadena de fallback</span>
        {fallbacks.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sin fallback (usa la semilla del sistema).</p>
        )}
        {fallbacks.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
            <div className="flex-1">
              <LlmModelSelect
                models={models}
                provider={f.provider}
                modelId={f.model_id}
                onChange={(p, m) => setFallback(i, p, m)}
                disabled={disabled}
                ariaLabel={`Fallback ${i + 1} de ${task}`}
              />
            </div>
            <IconBtn title="Subir" onClick={() => move(i, -1)} disabled={disabled || i === 0}>
              <ArrowUp size={15} weight="bold" />
            </IconBtn>
            <IconBtn
              title="Bajar"
              onClick={() => move(i, 1)}
              disabled={disabled || i === fallbacks.length - 1}
            >
              <ArrowDown size={15} weight="bold" />
            </IconBtn>
            <IconBtn title="Quitar" onClick={() => removeFallback(i)} disabled={disabled}>
              <Trash size={15} weight="duotone" />
            </IconBtn>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addFallback} disabled={disabled}>
          <Plus size={14} weight="bold" /> Agregar fallback
        </Button>
      </div>
    </div>
  )
}
