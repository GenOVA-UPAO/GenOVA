import { Lock, Star, Warning } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatContextLength, pricingLabel } from '../../lib/llmCatalogUtils.js'

/** One selectable model row inside the full-catalog browser. */
export function ModelCatalogRow({ model, locked, enabled, saving, categoryLabels, onToggle }) {
  const ctx = formatContextLength(model.context_length)
  return (
    <label
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors
        ${locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}`}
    >
      <Checkbox
        checked={enabled}
        disabled={locked || saving}
        onCheckedChange={() => !locked && onToggle(model.provider, model.model_id)}
      />
      <span className="flex-1 truncate text-foreground inline-flex items-center gap-1 min-w-0">
        <span className="truncate">{model.label || model.model_id}</span>
        {model.curated ? (
          <Star
            size={12} weight="fill"
            className="shrink-0 text-accent-brand"
            aria-label="Recomendado para OVAs"
          />
        ) : (
          <Warning
            size={12} weight="duotone"
            className="shrink-0 text-muted-foreground/60"
            aria-label="No optimizado para OVAs"
          />
        )}
        {locked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
            <Lock size={10} weight="duotone" /> por defecto
          </span>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {(categoryLabels || {})[model.category || 'texto'] || model.category || 'texto'}
      </span>
      {ctx && (
        <span className="text-[10px] text-muted-foreground/70 shrink-0 hidden sm:inline">{ctx}</span>
      )}
      <span className="text-[10px] text-muted-foreground/70 shrink-0">
        {pricingLabel(model.pricing)}
      </span>
    </label>
  )
}
