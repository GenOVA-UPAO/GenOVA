import { ResourceList } from './ResourceList.jsx'

const STATUS_LABEL = {
  queued: 'En cola…',
  running: 'Generando recursos…',
  interrupted: 'Generación interrumpida',
  error: 'La generación terminó con errores',
  done: '¡OVA generado!',
  canceled: 'Generación cancelada',
}

function RetryHeader({ failedCount, selectedCount, onSelectAll, onRetrySelected }) {
  if (failedCount === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={onSelectAll}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Seleccionar todos los fallidos
      </button>
      <button
        type="button"
        onClick={onRetrySelected}
        disabled={selectedCount === 0}
        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Reintentar seleccionados ({selectedCount})
      </button>
    </div>
  )
}

export function ProgressPanel({
  job, viewModel, selectedIds, activeId,
  onToggle, onRetryOne, onPreview, onSelectAll, onRetrySelected,
}) {
  const status = job?.status || 'queued'
  const failedCount = viewModel.filter((r) => r.status === 'X').length
  const doneCount = viewModel.filter((r) => r.status === 'check').length
  const total = viewModel.length || 1
  const pct = Math.round((doneCount / total) * 100)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-slate-700">{STATUS_LABEL[status] || status}</span>
          <span className="text-xs font-semibold text-slate-500">
            {doneCount}/{viewModel.length} listos
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              failedCount ? 'bg-amber-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ResourceList
        viewModel={viewModel}
        selectedIds={selectedIds}
        activeId={activeId}
        onToggle={onToggle}
        onRetry={onRetryOne}
        onPreview={onPreview}
      />

      <RetryHeader
        failedCount={failedCount}
        selectedCount={selectedIds.length}
        onSelectAll={onSelectAll}
        onRetrySelected={onRetrySelected}
      />
    </div>
  )
}
