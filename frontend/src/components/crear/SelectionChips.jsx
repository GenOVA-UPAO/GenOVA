const PHASE_STYLE = {
  engage: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  explore: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const PHASE_EMOJI = { engage: '🎯', explore: '🔍' }

function PhaseGroup({ phase, items }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {PHASE_EMOJI[phase]} {phase}
      </span>
      {items.map((r, i) => (
        <span
          key={`${phase}-${r.id}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${PHASE_STYLE[phase]}`}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/70 text-[10px] font-bold">
            {i + 1}
          </span>
          {r.emoji} {r.tipo}
        </span>
      ))}
    </div>
  )
}

export function SelectionChips({ engage, explore, onEdit, editable }) {
  const hasAny = engage.length > 0 || explore.length > 0
  if (!hasAny) return null

  const total = engage.length + explore.length

  return (
    <div className="space-y-2">
      <PhaseGroup phase="engage" items={engage} />
      <PhaseGroup phase="explore" items={explore} />
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          Total: <b className="text-slate-700">{total}</b> recurso{total === 1 ? '' : 's'}
        </span>
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="text-indigo-600 underline hover:text-indigo-800"
          >
            Editar selección
          </button>
        )}
      </div>
    </div>
  )
}
