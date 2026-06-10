import { useLlmSettings } from '../hooks/useLlmSettings.js'

const PROVIDER_LABELS = { groq: 'Groq', openrouter: 'OpenRouter' }
const PROVIDER_BADGE = {
  groq: 'bg-amber-50 text-amber-700 border-amber-200',
  openrouter: 'bg-sky-50 text-sky-700 border-sky-200',
}

function _pricingShort(pricing) {
  if (!pricing) return 'Gratuito'
  if (typeof pricing === 'string') {
    if (pricing === 'Gratuito') return 'Gratuito'
    if (pricing.includes('/1M')) return pricing.split('· ').pop() || pricing
    return pricing
  }
  return 'Gratuito'
}

export function LlmEnginesPanel() {
  const { catalogAll, loading, error, isModelEnabled, isDefaultModel } = useLlmSettings(true)

  if (loading) {
    return <p className="text-xs text-slate-400">Cargando motores de IA…</p>
  }
  if (error) {
    return <p className="text-xs text-rose-600">{error}</p>
  }

  const active = (catalogAll || []).filter((e) => {
    if (!e.active) return false
    if (isDefaultModel(e.provider, e.model_id)) return true
    return isModelEnabled(e.provider, e.model_id)
  })

  if (active.length === 0) return null

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 list-none select-none">
        <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▶</span>
        Motores de IA activos · {active.length}
      </summary>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {active.map((m) => (
          <li
            key={`${m.provider}:${m.model_id}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 truncate">{m.label || m.model_id}</span>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                  PROVIDER_BADGE[m.provider] || 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {PROVIDER_LABELS[m.provider] || m.provider}
              </span>
            </div>
            <p className="mt-0.5 text-slate-500 flex items-center gap-2">
              <span className="font-mono">{m.task}</span>
              {(m.pricing || m.context_length) && (
                <span className="text-[10px] text-slate-400">
                  {_pricingShort(m.pricing)}
                  {m.context_length ? ` · ${(m.context_length / 1000).toFixed(0)}k ctx` : ''}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </details>
  )
}
