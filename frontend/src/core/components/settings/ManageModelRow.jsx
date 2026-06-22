import { CircleNotch, CurrencyDollar, Lock } from '@phosphor-icons/react'

/** Single row in ManageModelsModal: toggle switch + name + description + pricing tooltip. */
export function ManageModelRow({ model, locked, enabled, saving, onToggle }) {
  const isFree = !model.pricing_detail && model.provider === 'groq'

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${locked ? 'opacity-60' : 'hover:bg-muted/40'}`}>
      {/* Toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={locked || saving}
        onClick={() => !locked && !saving && onToggle(model.provider, model.model_id)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          ${enabled ? 'bg-primary' : 'bg-input'}
          ${locked ? 'cursor-not-allowed' : saving ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
      >
        {saving
          ? <span className="absolute inset-0 flex items-center justify-center">
              <CircleNotch size={10} className="animate-spin text-white" />
            </span>
          : <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg
              transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        }
      </button>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground truncate">
            {model.label || model.model_id}
          </span>
          {locked && <Lock size={10} weight="duotone" className="shrink-0 text-muted-foreground/50" title="Modelo base del sistema" />}
        </div>
        {model.description && (
          <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{model.description}</p>
        )}
      </div>

      {/* Pricing */}
      {isFree ? (
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
          Gratis
        </span>
      ) : model.pricing_detail ? (
        <div className="relative group/price shrink-0 flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {model.pricing ? model.pricing.replace(' por 1M tokens', '') : '—'}
          </span>
          <span className="cursor-default text-muted-foreground/40 hover:text-primary transition-colors">
            <CurrencyDollar size={13} />
          </span>
          {/* Tooltip */}
          <div className="invisible group-hover/price:visible absolute right-0 bottom-6 z-50
            w-52 rounded-xl border border-border bg-popover p-3 shadow-xl text-[11px] space-y-1.5">
            <p className="font-bold text-foreground text-xs mb-2">Precio / 1M tokens</p>
            {model.pricing_detail.input != null && (
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>Entrada</span>
                <span className="font-mono text-foreground">${model.pricing_detail.input.toFixed(4)}</span>
              </div>
            )}
            {model.pricing_detail.output != null && (
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>Salida</span>
                <span className="font-mono text-foreground">${model.pricing_detail.output.toFixed(4)}</span>
              </div>
            )}
            {model.pricing_detail.cache_read != null && (
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>Cache lectura</span>
                <span className="font-mono text-foreground">${model.pricing_detail.cache_read.toFixed(4)}</span>
              </div>
            )}
            {model.pricing_detail.cache_write != null && (
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>Cache escritura</span>
                <span className="font-mono text-foreground">${model.pricing_detail.cache_write.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
