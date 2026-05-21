import { checkHtmlQuality } from '../../lib/labQuality.js'

function QualityBadge({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

export function ResultCard({ result, isWinner, onSelectWinner, onExportScorm }) {
  if (!result) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-400">Generando...</p>
      </div>
    )
  }

  const q = result.quality_checks || checkHtmlQuality(result.html_content)
  const isDone = result.status === 'done'
  const isError = result.status === 'error'

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-all ${
        isWinner ? 'border-indigo-500 shadow-lg' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl bg-slate-50 px-4 py-2.5">
        <div>
          <span className="text-xs font-semibold text-slate-700">
            {result.model_id?.split('/').pop() || result.model_id}
          </span>
          <span
            className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              result.provider === 'groq'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {result.provider}
          </span>
        </div>
        {isDone && (
          <span className="text-[10px] text-slate-400">
            {result.generation_ms ? `${(result.generation_ms / 1000).toFixed(1)}s` : ''}
          </span>
        )}
      </div>

      {/* Preview or error */}
      <div className="relative flex-1">
        {isError ? (
          <div className="flex min-h-[300px] items-center justify-center bg-red-50 p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-red-600">Error al generar</p>
              <p className="mt-1 text-xs text-red-400 max-w-xs break-words">{result.error}</p>
            </div>
          </div>
        ) : isDone && result.html_content ? (
          <iframe
            srcDoc={result.html_content}
            sandbox="allow-scripts allow-same-origin"
            className="h-[360px] w-full rounded-none border-0"
            title={`Lab result ${result.result_id}`}
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              <p className="text-xs text-slate-400">Generando recurso...</p>
            </div>
          </div>
        )}
      </div>

      {/* Quality badges */}
      {isDone && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-2">
          <QualityBadge ok={q.cdn_ok} label="CDN libre" />
          <QualityBadge ok={q.scorm_ok} label="SCORM OK" />
          <QualityBadge ok={q.min_length_ok} label={`${(q.char_count / 1000).toFixed(1)}k chars`} />
        </div>
      )}

      {/* Actions */}
      {isDone && !isError && (
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button
            onClick={() => onSelectWinner(result.result_id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              isWinner
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            {isWinner ? '✓ Seleccionado' : 'Seleccionar ganador'}
          </button>
          <button
            onClick={() => onExportScorm(result.result_id)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            title="Exportar como SCORM"
          >
            ⬇ SCORM
          </button>
        </div>
      )}
    </div>
  )
}
