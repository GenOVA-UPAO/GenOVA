import { Button } from '@/components/ui/button'
import { useLlmSettings } from '../../hooks/useLlmSettings.js'
import { LlmSettingsForm } from './LlmSettingsForm.jsx'

const PROVIDER_LABELS = { groq: 'Groq', openrouter: 'OpenRouter' }

function _groupByProvider(entries) {
  if (!Array.isArray(entries)) return {}
  const groups = {}
  for (const e of entries) {
    const p = e.provider || 'unknown'
    if (!groups[p]) groups[p] = []
    groups[p].push(e)
  }
  return groups
}

function _pricingLabel(pricing) {
  if (!pricing) return 'Gratuito'
  if (typeof pricing === 'string') return pricing
  return 'Gratuito'
}

/** Profile-page home for the per-user LLM config: model catalog toggles + per-task assignment. */
export function LlmSettingsCard() {
  const hook = useLlmSettings(true)
  const {
    catalogAll, enabledSaving, loading,
    isDefaultModel, isModelEnabled, toggleModel, saveEnabled,
  } = hook

  const grouped = _groupByProvider(catalogAll)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Modelos de generación (IA)</h2>
        <p className="text-sm text-slate-500">
          Habilita los modelos que quieres usar. Luego asígnalos a cada tipo de tarea.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
        </div>
      ) : (
        <>
          {/* --- Catalog toggles --- */}
          <details className="group" open>
            <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 list-none select-none">
              <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▶</span>
              Catálogo completo ({catalogAll.length} modelos)
            </summary>
            <div className="mt-3 space-y-4">
              {Object.entries(grouped).map(([provider, models]) => (
                <div key={provider} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {PROVIDER_LABELS[provider] || provider}
                    {provider === 'groq' && <span className="ml-1 font-normal normal-case text-[10px] text-slate-400">(gratuito)</span>}
                  </h3>
                  <div className="space-y-1.5">
                    {models.map((m) => {
                      const locked = isDefaultModel(provider, m.model_id)
                      const enabled = isModelEnabled(provider, m.model_id) || locked
                      return (
                        <label
                          key={`${provider}:${m.model_id}`}
                          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors
                            ${locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={locked || enabledSaving}
                              onChange={() => !locked && toggleModel(provider, m.model_id)}
                              className="sr-only"
                            />
                            <div
                              className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors
                                ${enabled ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}
                                ${locked ? 'opacity-50' : ''}`}
                            >
                              {enabled && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {locked ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  )}
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="flex-1 truncate">
                            {m.label || m.model_id}
                            {locked && <span className="ml-1 text-[10px] text-slate-400">(por defecto)</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {_pricingLabel(m.pricing)}
                            {m.context_length ? ` · ${(m.context_length / 1000).toFixed(0)}k ctx` : ''}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={saveEnabled} disabled={enabledSaving || loading} size="sm" variant="outline">
                  {enabledSaving ? 'Guardando…' : 'Guardar modelos'}
                </Button>
              </div>
            </div>
          </details>

          {/* --- Per-task assignment --- */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              Asignar modelo por tipo de tarea
            </h3>
            <LlmSettingsForm hook={hook} />
          </div>

          <div className="flex justify-end">
            <Button onClick={hook.save} disabled={hook.saving || loading}>
              {hook.saving ? 'Guardando…' : 'Guardar configuración'}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
