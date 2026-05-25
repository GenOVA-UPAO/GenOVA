import { useLlmOptions } from '../hooks/useLlmOptions.js'

const PROVIDER_BADGE = {
  Groq: 'bg-amber-50 text-amber-700 border-amber-200',
  OpenRouter: 'bg-sky-50 text-sky-700 border-sky-200',
}

export function LlmEnginesPanel() {
  const { options, loading, error } = useLlmOptions()

  if (loading) {
    return <p className="text-xs text-slate-400">Cargando motores de IA…</p>
  }
  if (error) {
    return <p className="text-xs text-rose-600">{error}</p>
  }
  if (options.length === 0) return null

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 list-none select-none">
        <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▶</span>
        Motores de IA activos · {options.length}
      </summary>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <li
            key={opt.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">{opt.label}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  PROVIDER_BADGE[opt.provider] || 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {opt.provider}
              </span>
            </div>
            <p className="mt-1 text-slate-500">
              <span className="font-mono">{opt.task}</span>
              {opt.notes ? ` · ${opt.notes}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </details>
  )
}
