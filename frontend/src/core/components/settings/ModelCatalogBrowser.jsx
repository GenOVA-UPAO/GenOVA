import { useEffect, useRef, useState } from 'react'
import { CloudSlash, MagnifyingGlass, MagnifyingGlassMinus, CaretDown } from '@phosphor-icons/react'
import { groupByProvider, PROVIDER_LABELS } from '@/core/lib/llm/llmCatalogUtils.js'
import { ModelCatalogRow } from '@/core/components/settings/ModelCatalogRow.jsx'

const PROVIDER_ACCENT = {
  groq: 'hover:border-emerald-400/60 hover:text-emerald-700 data-[active=true]:border-emerald-400 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700 dark:data-[active=true]:bg-emerald-950/30 dark:data-[active=true]:text-emerald-400',
  openrouter: 'hover:border-violet-400/60 hover:text-violet-700 data-[active=true]:border-violet-400 data-[active=true]:bg-violet-50 data-[active=true]:text-violet-700 dark:data-[active=true]:bg-violet-950/30 dark:data-[active=true]:text-violet-400',
  opencode: 'hover:border-sky-400/60 hover:text-sky-700 data-[active=true]:border-sky-400 data-[active=true]:bg-sky-50 data-[active=true]:text-sky-700 dark:data-[active=true]:bg-sky-950/30 dark:data-[active=true]:text-sky-400',
  recommended: 'hover:border-amber-400/60 hover:text-amber-700 data-[active=true]:border-amber-400 data-[active=true]:bg-amber-50 data-[active=true]:text-amber-700 dark:data-[active=true]:bg-amber-950/30 dark:data-[active=true]:text-amber-400',
}

function Chip({ value, label, active, onClick, accent }) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={() => onClick(value)}
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border transition duration-150 whitespace-nowrap
        ${active
          ? 'border-primary bg-primary/8 text-primary font-semibold'
          : `border-border/50 bg-transparent text-muted-foreground/70 ${accent || 'hover:border-primary/40 hover:text-primary hover:bg-primary/4'}`
        }`}
    >
      {label}
    </button>
  )
}

function FilterRow({ label, options, active, onSelect, labelMap, accentMap }) {
  if (!options || options.length <= 1) return null
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/40 pt-1.5 min-w-[60px] text-right">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Chip
            key={opt}
            value={opt}
            label={labelMap?.[opt] || opt}
            active={active === opt || (!active && opt === 'all')}
            onClick={onSelect}
            accent={accentMap?.[opt]}
          />
        ))}
      </div>
    </div>
  )
}

/** Full-catalog browser: refined filter UI, star toggle, infinite scroll. */
export function ModelCatalogBrowser({ hook }) {
  const {
    catalogFull, fullTotal, fullHasMore, categories, types, loading, loadingMore,
    searchQuery, categoryFilter, typeFilter,
    isDefaultModel, isModelEnabled, toggleFavorite,
    loadMore, handleSearch, handleCategory, handleType,
    categoryLabels, typeLabels,
  } = hook

  const [savingKey, setSavingKey] = useState(null)
  const [open, setOpen] = useState(true)
  const sentinelRef = useRef(null)

  const handleToggle = async (provider, modelId) => {
    const key = `${provider}:${modelId}`
    setSavingKey(key)
    await toggleFavorite(provider, modelId)
    setSavingKey(null)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && fullHasMore && !loadingMore && !loading) loadMore() },
      { rootMargin: '200px' },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [fullHasMore, loadingMore, loading, loadMore])

  const grouped = groupByProvider(catalogFull)
  const isEmpty = catalogFull.length === 0 && !loading
  const accentMap = { recommended: PROVIDER_ACCENT.recommended, ...Object.fromEntries(Object.keys(PROVIDER_ACCENT).filter(k => k !== 'recommended').map(k => [k, PROVIDER_ACCENT[k]])) }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">Catálogo completo</span>
          <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 tabular-nums">{fullTotal}</span>
        </div>
        <CaretDown size={14} weight="bold" className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-border/50">
          {/* Search + filters panel */}
          <div className="px-5 py-4 space-y-3 bg-muted/20 border-b border-border/40">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass size={14} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Buscar modelo..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8.5 pr-4 py-2 text-xs rounded-lg border border-border/60 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/40 transition"
              />
            </div>

            {/* Filter rows */}
            <div className="space-y-2">
              <FilterRow
                label="Proveedor"
                options={categories}
                active={categoryFilter}
                onSelect={handleCategory}
                labelMap={categoryLabels}
                accentMap={accentMap}
              />
              <FilterRow
                label="Tipo"
                options={types}
                active={typeFilter}
                onSelect={handleType}
                labelMap={typeLabels}
              />
            </div>
          </div>

          {/* Results */}
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              {searchQuery
                ? <MagnifyingGlassMinus size={28} weight="duotone" className="text-muted-foreground/40" />
                : <CloudSlash size={28} weight="duotone" className="text-muted-foreground/40" />
              }
              <p className="text-xs text-muted-foreground/60">
                {searchQuery ? 'Sin coincidencias.' : 'Catálogo no disponible.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-border/40">
              {Object.entries(grouped).map(([provider, models]) => (
                <div key={provider} className="px-5 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/50 mb-2 flex items-center gap-1.5">
                    {PROVIDER_LABELS[provider] || provider}
                    {provider === 'groq' && <span className="font-normal normal-case tracking-normal text-muted-foreground/40">· gratuito</span>}
                  </p>
                  <div className="space-y-0.5">
                    {models.map((m) => {
                      const key = `${m.provider}:${m.model_id}`
                      const locked = isDefaultModel(m.provider, m.model_id)
                      return (
                        <ModelCatalogRow
                          key={key}
                          model={m}
                          locked={locked}
                          enabled={isModelEnabled(m.provider, m.model_id) || locked}
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
                <div className="flex justify-center py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
