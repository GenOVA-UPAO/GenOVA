import { BookBookmark } from '@phosphor-icons/react'
import { RESOURCE_ICONS } from '@/features/ova_library/lib/resourceIcons.js'

const INTERACTIVIDAD_COLOR = {
  Alta: 'bg-primary/10 text-primary',
  Media: 'bg-accent-brand/10 text-accent-brand',
  Baja: 'bg-muted text-muted-foreground',
}

export function ResourceCard({
  resource, selected, onClick, onHover,
  phaseKey = '', phaseColor = '#3B82F6',
  selectionIndex = null, disabled = false,
  showVideoHint = false,
}) {
  const Icon = RESOURCE_ICONS[`${phaseKey}:${resource.id}`] ?? BookBookmark

  let baseClass = 'border-border bg-card hover:border-primary/30 hover:shadow-md'
  if (disabled) baseClass = 'border-border bg-muted/40 opacity-50 cursor-not-allowed'

  const selectedStyle = selected ? {
    boxShadow: `0 0 0 2px ${phaseColor}`,
    borderColor: `${phaseColor}50`,
    backgroundColor: `${phaseColor}08`,
  } : undefined

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
      className={`text-left w-full rounded-xl border p-4 transition-all duration-150 cursor-pointer ${baseClass}`}
      style={selectedStyle}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 mt-0.5 p-1.5 rounded-lg"
          style={{ backgroundColor: `${phaseColor}18` }}
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
          <span
            className="flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold"
            style={{ backgroundColor: phaseColor }}
          >
            {selectionIndex ?? '✓'}
          </span>
        )}
      </div>
    </button>
  )
}
