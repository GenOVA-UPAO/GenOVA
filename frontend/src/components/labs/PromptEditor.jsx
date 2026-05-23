export function PromptEditor({ promptText, setPromptText, loadingPrompts, onResetBase }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold text-slate-700">
        Prompt{' '}
        <span className="font-normal text-slate-400 text-xs">
          — usa <code className="bg-slate-100 px-1 rounded">{'{concept}'}</code> como marcador
        </span>
      </label>

      {loadingPrompts ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={14}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
          placeholder="Selecciona un recurso para cargar el prompt base..."
        />
      )}

      <button
        onClick={onResetBase}
        className="self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
      >
        ↺ Prompt base
      </button>

      <p className="text-xs text-slate-400">
        Los cambios al prompt son solo para esta prueba — Labs es un sandbox. Para
        producción, edita los prompts en el código del backend.
      </p>
    </div>
  )
}
