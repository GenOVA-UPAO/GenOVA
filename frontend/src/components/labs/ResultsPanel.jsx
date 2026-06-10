import { Button } from '@/components/ui/button'
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
  const count = total || 2
  const slots = Array.from({ length: count }, (_, i) => results[i] || null)

  return (
    <div className="flex flex-col gap-4">
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

      {!generating && results.length > 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">🤖 Mejorar prompt con IA</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canImprove
                  ? 'La IA analizará el ganador y sugerirá un prompt mejorado.'
                  : 'Selecciona un ganador primero para mejorar el prompt.'}
              </p>
            </div>
            <Button
              onClick={onImprovePrompt}
              disabled={!canImprove || improving}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
            >
              {improving ? 'Analizando...' : 'Mejorar prompt'}
            </Button>
          </div>

          {improvedPrompt ? (
            <div className="mt-4 space-y-3">
              {improvedPrompt.explanation ? (
                <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
                  <p className="text-xs font-semibold text-violet-700">Análisis de la IA</p>
                  <p className="mt-1 text-xs text-violet-600 leading-relaxed">
                    {improvedPrompt.explanation}
                  </p>
                </div>
              ) : null}
              {improvedPrompt.improved_prompt ? (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Prompt sugerido</p>
                  <pre className="max-h-48 overflow-y-auto rounded-lg bg-background border border-border p-3 text-[11px] text-foreground whitespace-pre-wrap">
                    {improvedPrompt.improved_prompt}
                  </pre>
                  <Button
                    size="sm"
                    onClick={onApplyImproved}
                    className="mt-2"
                  >
                    Aplicar al editor
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
