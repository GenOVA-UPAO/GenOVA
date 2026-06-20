import { useEffect, useRef, useState } from 'react'
import { CaretRight, CloudSlash, MagnifyingGlass, MagnifyingGlassMinus } from '@phosphor-icons/react'
import { groupByProvider, PROVIDER_LABELS } from '../../lib/llmCatalogUtils.js'
import { ModelCatalogRow } from './ModelCatalogRow.jsx'

function FilterChips({ options, active, onSelect, labelMap, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {(options || []).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap
            ${active === opt || (!active && opt === 'all')
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'}`}
        >
          {labelMap?.[opt] || opt}
        </button>
      ))}
    </div>
  )
}

/** Collapsible full-catalog browser: search + inline provider/type filters,
 *  interactive star toggle, provider groups, infinite scroll and save. */
export function ModelCatalogBrowser({ hook }) {
  const {
    catalogFull, fullTotal, fullHasMore, categories, types, loading, loadingMore,
    searchQuery, categoryFilter, typeFilter,
    isDefaultModel, isModelEnabled, toggleFavorite,
    loadMore, handleSearch, handleCategory, handleType,
    categoryLabels, typeLabels,
  } = hook

  const [savingKey, setSavingKey] = useState(null)

  const handleToggle = async (provider, modelId) => {
    const key = `${provider}:${modelId}`
    setSavingKey(key)
    await toggleFavorite(provider, modelId)
    setSavingKey(null)
  }

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

  const grouped = groupByProvider(catalogFull)
  const isEmpty = catalogFull.length === 0 && !loading

  return (
    <details className="group" open>
      <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2 list-none select-none">
        <CaretRight size={14} weight="bold" className="text-muted-foreground group-open:rotate-90 transition-transform" />
        Catálogo completo ({fullTotal} modelos)
      </summary>

      <div className="mt-3 space-y-2.5">
        {/* Search + provider chips inline */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[180px] flex-1">
            <MagnifyingGlass size={14} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar modelo..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <FilterChips
            options={categories}
            active={categoryFilter}
            onSelect={handleCategory}
            labelMap={categoryLabels}
          />
        </div>

        {/* Type chips row */}
        {types && types.length > 1 && (
          <FilterChips
            options={types}
            active={typeFilter}
            onSelect={handleType}
            labelMap={typeLabels}
          />
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            {searchQuery ? (
              <MagnifyingGlassMinus size={32} weight="duotone" className="text-muted-foreground/50" />
            ) : (
              <CloudSlash size={32} weight="duotone" className="text-muted-foreground/50" />
            )}
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? 'No hay modelos que coincidan con tu búsqueda.'
                : 'El catálogo no está disponible por el momento.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[420px] overflow-y-auto">
            {Object.entries(grouped).map(([provider, models]) => (
              <div key={provider} className="rounded-lg border border-border bg-muted/40 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {PROVIDER_LABELS[provider] || provider}
                  {provider === 'groq' && (
                    <span className="ml-1 font-normal normal-case text-[10px] text-muted-foreground/70">(gratuito)</span>
                  )}
                </h3>
                <div className="space-y-1.5">
                  {models.map((m) => {
                    const key = `${m.provider}:${m.model_id}`
                    const locked = isDefaultModel(m.provider, m.model_id)
                    const enabled = isModelEnabled(m.provider, m.model_id) || locked
                    return (
                      <ModelCatalogRow
                        key={key}
                        model={m}
                        locked={locked}
                        enabled={enabled}
                        saving={savingKey === key}
                        typeLabels={typeLabels}
                        onToggle={handleToggle}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex items-center justify-center py-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            )}
          </div>
        )}

      </div>
    </details>
  )
}
