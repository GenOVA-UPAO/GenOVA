const INTERACTIVIDAD_COLOR = {
  Alta: 'bg-primary/10 text-primary',
  Media: 'bg-accent-brand/10 text-accent-brand',
  Baja: 'bg-muted text-muted-foreground',
}

export function ResourceCard({
  resource, selected, onClick, selectionIndex = null, disabled = false,
  selectedRingCls = 'ring-2 ring-primary border-primary/40 bg-primary/5',
  selectedBadgeCls = 'bg-primary',
}) {
  let ring = 'border-border bg-card hover:border-primary/30 hover:shadow-md'
  if (selected) {
    ring = selectedRingCls
  } else if (disabled) {
    ring = 'border-border bg-muted/40 opacity-50 cursor-not-allowed'
  }

  function handleClick() {
    if (disabled) return
    onClick(resource)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      disabled={disabled}
      className={`text-left w-full rounded-xl border p-4 transition-all duration-150 cursor-pointer ${ring}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{resource.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{resource.tipo}</span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${INTERACTIVIDAD_COLOR[resource.interactividad] || INTERACTIVIDAD_COLOR.Baja}`}
            >
              {resource.interactividad}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">⏱ {resource.duracion}</p>
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
