export function VersionHistory({ versions, open, onToggle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>Historial de versiones ({versions.length})</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                v{v.version_number}
                {v.is_active && ' (actual)'}
              </span>
              <span className="text-xs text-slate-500 flex-1 truncate">
                {v.prompt ? `"${v.prompt.slice(0, 60)}${v.prompt.length > 60 ? '…' : ''}"` : '—'}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {v.created_at ? new Date(v.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
