export function PromptEditor({
  promptText,
  setPromptText,
  versions,
  loadingPrompts,
  onResetBase,
  onLoadVersion,
  onSaveVersion,
}) {
  const activeVersion = versions.find((v) => v.is_active)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">
          Prompt{' '}
          <span className="font-normal text-slate-400 text-xs">
            — usa <code className="bg-slate-100 px-1 rounded">{'{concept}'}</code> como marcador
          </span>
        </label>
        {activeVersion && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            v{activeVersion.version_number} activa en producción
          </span>
        )}
      </div>

      {loadingPrompts ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
          placeholder="Selecciona un recurso para cargar el prompt base..."
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onResetBase}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          ↺ Prompt base
        </button>
        <button
          onClick={() => onSaveVersion('')}
          disabled={!promptText}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          Guardar versión
        </button>
      </div>

      {versions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Versiones guardadas
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                  v.is_active ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <span className="font-medium text-slate-700">v{v.version_number}</span>
                  <span className="ml-2 text-slate-400">{v.model_id.split('/').pop()}</span>
                  {v.is_active && (
                    <span className="ml-2 text-green-600 font-medium">● producción</span>
                  )}
                  {v.notes && <span className="ml-2 text-slate-400 italic">{v.notes}</span>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onLoadVersion(v)}
                    className="rounded px-2 py-0.5 text-indigo-600 hover:bg-indigo-50"
                  >
                    Cargar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
