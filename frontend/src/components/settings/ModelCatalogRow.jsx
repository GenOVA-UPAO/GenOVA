import { Lock, Star, Warning } from '@phosphor-icons/react'
import { formatContextLength, MODALITY_META } from '../../lib/llmCatalogUtils.js'

const MODALITY_ICONS = {
  text: 'Aa',
  multimodal: '◆',
  image: '◇',
  audio: '♪',
  embedding: '⬡',
}

/** One selectable model row. Star = user favorite (toggles enabled_models). */
export function ModelCatalogRow({ model, locked, enabled, saving, typeLabels, onToggle }) {
  const ctx = formatContextLength(model.context_length)
  const modality = model.modality || 'text'
  const meta = MODALITY_META[modality] || MODALITY_META.text

  return (
    <div
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors
        ${locked ? 'opacity-70' : 'hover:bg-muted'}`}
    >
      {/* Interactive star = favorite/enabled toggle */}
      <button
        type="button"
        disabled={locked || saving}
        onClick={() => !locked && onToggle(model.provider, model.model_id)}
        className={`shrink-0 transition-colors rounded p-0.5
          ${locked ? 'cursor-not-allowed text-accent-brand' : 'cursor-pointer hover:scale-110'}
          ${enabled ? 'text-accent-brand' : 'text-muted-foreground/30 hover:text-accent-brand/60'}`}
        aria-label={enabled ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        title={locked ? 'Modelo base del sistema' : enabled ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      >
        <Star size={14} weight={enabled ? 'fill' : 'regular'} />
      </button>

      {/* Model name + curated indicator */}
      <span className="flex-1 truncate text-foreground inline-flex items-center gap-1 min-w-0">
        <span className="truncate">{model.label || model.model_id}</span>
        {!model.curated && (
          <Warning
            size={11} weight="duotone"
            className="shrink-0 text-muted-foreground/40"
            title="No optimizado para OVAs"
          />
        )}
        {locked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
            <Lock size={9} weight="duotone" /> sistema
          </span>
        )}
      </span>

      {/* Modality badge */}
      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${meta.bg} ${meta.color}`}>
        <span className="opacity-70">{MODALITY_ICONS[modality] || 'Aa'}</span>
        {meta.label}
      </span>

      {/* Category/type */}
      <span className="text-[10px] text-muted-foreground shrink-0">
        {typeLabels?.[model.category || 'texto'] || model.category || 'texto'}
      </span>

      {/* Context length */}
      {ctx && (
        <span className="text-[10px] text-muted-foreground/70 shrink-0 hidden sm:inline">{ctx}</span>
      )}
    </div>
  )
}
