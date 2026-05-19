export function BulkTrashModal({ count, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-900">Mover a la papelera</h2>
        <p className="mt-2 text-sm text-slate-600">
          ¿Mover <span className="font-semibold text-slate-800">{count} OVAs</span> a la papelera?
        </p>
        <p className="mt-1 text-xs text-slate-400">Podrás restaurarlos desde la sección Papelera.</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} disabled={isLoading} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
            {isLoading ? 'Moviendo...' : `Mover ${count}`}
          </button>
        </div>
      </div>
    </div>
  )
}
