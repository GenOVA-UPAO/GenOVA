import { ResultCard } from './ResultCard.jsx'

export function ResultsPanel({
  results,
  generating,
  total,
  winnerId,
  onSelectWinner,
  onExportScorm,
  improving,
  improvedPrompt,
  onImprovePrompt,
  onApplyImproved,
  canImprove,
}) {
  // Build slots: fill up to `total` slots (default 2)
  const count = total || 2
  const slots = Array.from({ length: count }, (_, i) => results[i] || null)

  return (
    <div className="flex flex-col gap-4">
      {/* Result grid */}
      <div className={`grid gap-4 ${count === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {slots.map((r, i) => (
          <ResultCard
            key={r?.result_id || `slot-${i}`}
            result={r}
            isWinner={r?.result_id === winnerId}
            onSelectWinner={onSelectWinner}
            onExportScorm={onExportScorm}
          />
        ))}
      </div>

      {/* AI Improve section */}
      {!generating && results.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">🤖 Mejorar prompt con IA</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {canImprove
                  ? 'La IA analizará el ganador y sugerirá un prompt mejorado.'
                  : 'Selecciona un ganador primero para mejorar el prompt.'}
              </p>
            </div>
            <button
              onClick={onImprovePrompt}
              disabled={!canImprove || improving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
            >
              {improving ? 'Analizando...' : 'Mejorar prompt'}
            </button>
          </div>

          {improvedPrompt && (
            <div className="mt-4 space-y-3">
              {improvedPrompt.explanation && (
                <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
                  <p className="text-xs font-semibold text-violet-700">Análisis de la IA</p>
                  <p className="mt-1 text-xs text-violet-600 leading-relaxed">
                    {improvedPrompt.explanation}
                  </p>
                </div>
              )}
              {improvedPrompt.improved_prompt && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">Prompt sugerido</p>
                  <pre className="max-h-48 overflow-y-auto rounded-lg bg-white border border-slate-200 p-3 text-[11px] text-slate-700 whitespace-pre-wrap">
                    {improvedPrompt.improved_prompt}
                  </pre>
                  <button
                    onClick={onApplyImproved}
                    className="mt-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Aplicar al editor
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
