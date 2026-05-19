export function EditMetadataModal({ form, onChange, onSubmit, onCancel, isLoading, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-900">Editar metadatos</h2>
        <p className="mt-1 text-xs text-slate-500">Actualiza el título y descripción del OVA.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="metadata-title" className="text-xs font-semibold text-slate-700">
              Título *
            </label>
            <input
              id="metadata-title"
              name="title"
              type="text"
              value={form.title}
              onChange={onChange}
              maxLength={250}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Ej. Regresión lineal aplicada"
            />
            <p className="mt-1 text-[11px] text-slate-400">{form.title.length}/100</p>
          </div>

          <div>
            <label htmlFor="metadata-description" className="text-xs font-semibold text-slate-700">
              Descripción
            </label>
            <textarea
              id="metadata-description"
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Opcional"
            />
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
