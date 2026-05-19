export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, isLoading, danger = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
