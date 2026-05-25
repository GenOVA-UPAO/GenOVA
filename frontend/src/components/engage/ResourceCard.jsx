const INTERACTIVIDAD_COLOR = {
  Alta: 'bg-emerald-100 text-emerald-700',
  Media: 'bg-amber-100 text-amber-700',
  Baja: 'bg-slate-100 text-slate-600',
}

export function ResourceCard({ resource, selected, onClick, selectionIndex = null, disabled = false }) {
  let ring = 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
  if (selected) {
    ring = 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50'
  } else if (disabled) {
    ring = 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
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
            <span className="font-semibold text-slate-900 text-sm">{resource.tipo}</span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${INTERACTIVIDAD_COLOR[resource.interactividad] || INTERACTIVIDAD_COLOR.Baja}`}
            >
              {resource.interactividad}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">⏱ {resource.duracion}</p>
        </div>
        {selected && (
          <span className="flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
            {selectionIndex ?? '✓'}
          </span>
        )}
      </div>
    </button>
  )
}
