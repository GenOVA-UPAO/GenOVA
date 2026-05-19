import { StatusBadge } from './StatusBadge'

export function TrashedOvaCard({ ova, isSelected, onToggleSelect, onRestore, onPermanentDelete, isRestoring, isDeleting }) {
  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(ova.id)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{ova.title}</h3>
            <StatusBadge status={ova.status} />
          </div>
          {ova.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{ova.description}</p>
          )}
          {ova.owner && (
            <p className="mt-1.5 text-xs text-slate-400">
              Por: <span className="font-medium text-slate-600">{ova.owner.full_name}</span>
            </p>
          )}
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            Eliminado el {formatDate(ova.deleted_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={() => onRestore(ova.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRestoring ? 'Restaurando...' : '↩ Restaurar'}
        </button>
        <button
          onClick={() => onPermanentDelete(ova)}
          disabled={isRestoring || isDeleting}
          className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? 'Eliminando...' : '🗑 Borrar definitivamente'}
        </button>
      </div>
    </div>
  )
}
