import { Lock, Star, Warning } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatContextLength, MODALITY_META, pricingLabel } from '../../lib/llmCatalogUtils.js'

const MODALITY_ICONS = {
  text: 'Aa',
  multimodal: '◆',
  image: '◇',
  audio: '♪',
  embedding: '⬡',
}

/** One selectable model row inside the full-catalog browser. */
export function ModelCatalogRow({ model, locked, enabled, saving, categoryLabels, onToggle }) {
  const ctx = formatContextLength(model.context_length)
  const modality = model.modality || 'text'
  const meta = MODALITY_META[modality] || MODALITY_META.text
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
      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${meta.bg} ${meta.color}`}>
        <span className="opacity-70">{MODALITY_ICONS[modality] || 'Aa'}</span>
        {meta.label}
      </span>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {categoryLabels?.[model.category || 'texto'] || model.category || 'texto'}
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
