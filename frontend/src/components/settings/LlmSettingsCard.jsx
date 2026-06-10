import { useEffect, useRef } from 'react'
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

export function LlmSettingsCard() {
  const hook = useLlmSettings(true)
  const {
    catalogFull, fullTotal, fullHasMore, categories, loading, loadingMore,
    searchQuery, categoryFilter, enabledSaving,
    isDefaultModel, isModelEnabled, toggleModel, saveEnabled,
    loadMore, handleSearch, handleCategory,
  } = hook

  const sentinelRef = useRef(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && fullHasMore && !loadingMore && !loading) loadMore()
      },
      { rootMargin: '200px' },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [fullHasMore, loadingMore, loading, loadMore])

  const grouped = _groupByProvider(catalogFull)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Modelos de generación (IA)</h2>
        <p className="text-sm text-slate-500">
          Habilita los modelos que quieres usar. Luego asígnalos a cada tipo de tarea.
        </p>
      </div>

      {loading && catalogFull.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
        </div>
      ) : (
        <>
          {/* --- Full catalog with search --- */}
          <details className="group" open>
            <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 list-none select-none">
              <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▶</span>
              Catálogo completo ({fullTotal} modelos)
            </summary>

            <div className="mt-3 space-y-3">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar modelo..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {(categories || []).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors
                      ${categoryFilter === cat || (!categoryFilter && cat === 'all')
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {(hook.categoryLabels || {})[cat] || cat}
                  </button>
                ))}
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto">
                {Object.entries(grouped).map(([provider, models]) => (
                  <div key={provider} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {PROVIDER_LABELS[provider] || provider}
                      {provider === 'groq' && (
                        <span className="ml-1 font-normal normal-case text-[10px] text-slate-400">(gratuito)</span>
                      )}
                    </h3>
                    <div className="space-y-1.5">
                      {models.map((m) => {
                        const locked = isDefaultModel(m.provider, m.model_id)
                        const enabled = isModelEnabled(m.provider, m.model_id) || locked
                        return (
                          <label
                            key={`${m.provider}:${m.model_id}`}
                            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors
                              ${locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={locked || enabledSaving}
                                onChange={() => !locked && toggleModel(m.provider, m.model_id)}
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
                              {m.curated && <span className="ml-1 text-[10px] text-amber-500" title="Recomendado para OVAs">★</span>}
                              {!m.curated && <span className="ml-1 text-[10px] text-slate-400" title="No optimizado para OVAs">⚠</span>}
                              {locked && <span className="ml-1 text-[10px] text-slate-400">(por defecto)</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {(hook.categoryLabels || {})[m.category || 'texto'] || m.category || 'texto'}
                            </span>
                            <span className="text-[10px] text-slate-300 shrink-0">
                              {_pricingLabel(m.pricing)}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex items-center justify-center py-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                  </div>
                )}
              </div>

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
