import { BookBookmark } from '@phosphor-icons/react'
import { RESOURCE_ICONS } from '@/features/ova_library/lib/resourceIcons.js'

const INTERACTIVIDAD_COLOR = {
  Alta: 'bg-primary/10 text-primary',
  Media: 'bg-accent-brand/10 text-accent-brand',
  Baja: 'bg-muted text-muted-foreground',
}

export function ResourceCard({
  resource, selected, onClick, onHover,
  phaseKey = '', phaseColor = 'var(--primary)',
  selectionIndex = null, disabled = false,
  selectedRingCls = 'ring-2 ring-primary border-primary/40 bg-primary/5',
  selectedBadgeCls = 'bg-primary',
  showVideoHint = false,
}) {
  const Icon = RESOURCE_ICONS[`${phaseKey}:${resource.id}`] ?? BookBookmark

  let ring = 'border-border bg-card hover:border-primary/30 hover:shadow-md'
  if (selected) ring = selectedRingCls
  else if (disabled) ring = 'border-border bg-muted/40 opacity-50 cursor-not-allowed'

  return (
    <button
      type="button"
      onClick={() => { if (!disabled) onClick(resource) }}
      onMouseEnter={() => onHover?.(resource)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(resource)}
      onBlur={() => onHover?.(null)}
      aria-pressed={selected}
      disabled={disabled}
      className={`text-left w-full rounded-xl border p-4 transition-all duration-150 cursor-pointer ${ring}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 mt-0.5 p-1.5 rounded-lg"
          style={{ backgroundColor: `color-mix(in oklch, ${phaseColor} 10%, transparent)` }}
        >
          <Icon size={20} weight="duotone" style={{ color: phaseColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{resource.tipo}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${INTERACTIVIDAD_COLOR[resource.interactividad] || INTERACTIVIDAD_COLOR.Baja}`}>
              {resource.interactividad}
            </span>
          </div>
          {showVideoHint && (
            <span className="text-xs text-amber-600 font-medium mt-1 block" title="Sin API key de video — generará prompt copiable">
              ⚠ Modo prompt
            </span>
          )}
        </div>
        {selected && (
          <span className={`flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full ${selectedBadgeCls} text-primary-foreground text-xs font-bold`}>
            {selectionIndex ?? '✓'}
          </span>
        )}
      </div>
    </button>
  )
}
