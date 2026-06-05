import { groupByPhase } from '../../lib/ovaJobViewModel.js'

// Visual config per UI status (R5): check ✔ · X ✖ · generando … · pendiente ○.
const MARK = {
  check: { icon: '✔', cls: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  X: { icon: '✖', cls: 'text-rose-600 border-rose-200 bg-rose-50' },
  generando: { icon: '…', cls: 'text-indigo-600 border-indigo-200 bg-indigo-50 animate-pulse' },
  pendiente: { icon: '○', cls: 'text-slate-400 border-slate-200 bg-slate-50' },
}

const PHASE_EMOJI = { engage: '🎯', explore: '🔍' }

function ResourceRow({ r, selected, onToggle, onRetry, onPreview, active }) {
  const mark = MARK[r.status] || MARK.pendiente
  const isError = r.status === 'X'
  const isDone = r.status === 'check'
  return (
    <li className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <div className="flex items-center gap-2.5">
        {isError && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(r.id)}
            aria-label={`Seleccionar ${r.label} para reintentar`}
            className="h-4 w-4 shrink-0 accent-rose-600 cursor-pointer"
          />
        )}
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold ${mark.cls}`}
        >
          {mark.icon}
        </span>
        <button
          type="button"
          onClick={isDone ? () => onPreview(r.id) : undefined}
          disabled={!isDone}
          className={`flex-1 min-w-0 truncate text-left text-sm ${
            isDone ? 'text-slate-800 hover:text-indigo-700 cursor-pointer' : 'text-slate-600'
          } ${active ? 'font-semibold text-indigo-700' : ''}`}
        >
          {r.emoji} {r.label}
        </button>
        {isError && (
          <button
            type="button"
            onClick={() => onRetry(r.id)}
            className="shrink-0 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
      {isError && (
        <p className="mt-1.5 pl-8 text-xs text-rose-600">
          Lo sentimos, hubo un error generando el recurso.
          {r.error_id && <span className="font-mono"> Error ID: {r.error_id}</span>}
        </p>
      )}
    </li>
  )
}

export function ResourceList({
  viewModel, selectedIds = [], activeId, onToggle, onRetry, onPreview,
}) {
  const groups = groupByPhase(viewModel)
  const selectedSet = new Set(selectedIds)
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.phase}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {PHASE_EMOJI[g.phase]} {g.phaseLabel}
          </p>
          <ul className="space-y-1.5">
            {g.items.map((r) => (
              <ResourceRow
                key={r.id}
                r={r}
                selected={selectedSet.has(r.id)}
                active={activeId === r.id}
                onToggle={onToggle}
                onRetry={onRetry}
                onPreview={onPreview}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
