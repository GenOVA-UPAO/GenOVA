import {
  CaretDown,
  CloudSlash,
  MagnifyingGlass,
  MagnifyingGlassMinus,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { ModelCatalogRow } from '@/core/settings/components/ModelCatalogRow.tsx'
import { FilterRow } from '@/core/settings/components/ModelCatalogFilters.tsx'
import {
  groupByProvider,
  PROVIDER_LABELS,
} from '@/core/settings/lib/llmCatalogUtils'

interface ModelCatalogBrowserProps {
  hook: {
    catalogFull: unknown[]
    fullTotal: number
    fullHasMore: boolean
    categories: string[]
    types: string[]
    loading: boolean
    loadingMore: boolean
    searchQuery: string
    categoryFilter: string
    typeFilter: string
    isDefaultModel: (provider: string, modelId: string) => boolean
    isModelEnabled: (provider: string, modelId: string) => boolean
    toggleFavorite: (provider: string, modelId: string) => Promise<void>
    loadMore: () => void
    handleSearch: (q: string) => void
    handleCategory: (cat: string) => void
    handleType: (t: string) => void
    categoryLabels: Record<string, string>
    typeLabels: Record<string, string>
  }
}

export function ModelCatalogBrowser({ hook }: ModelCatalogBrowserProps) {
  const {
    catalogFull,
    fullTotal,
    fullHasMore,
    categories,
    types,
    loading,
    loadingMore,
    searchQuery,
    categoryFilter,
    typeFilter,
    isDefaultModel,
    isModelEnabled,
    toggleFavorite,
    loadMore,
    handleSearch,
    handleCategory,
    handleType,
    categoryLabels,
    typeLabels,
  } = hook

  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [open, setOpen] = useState(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const handleToggle = async (provider: string, modelId: string) => {
    const key = `${provider}:${modelId}`
    setSavingKey(key)
    await toggleFavorite(provider, modelId)
    setSavingKey(null)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && fullHasMore && !loadingMore && !loading)
          loadMore()
      },
      { rootMargin: '200px' },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [fullHasMore, loadingMore, loading, loadMore])

  const grouped = groupByProvider(catalogFull as Array<{ provider?: string }>)
  const isEmpty = catalogFull.length === 0 && !loading

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">
            Catálogo completo
          </span>
          <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 tabular-nums">
            {fullTotal}
          </span>
        </div>
        <CaretDown
          size={14}
          weight="bold"
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/50">
          <div className="px-5 py-4 space-y-3 bg-muted/20 border-b border-border/40">
            <div className="relative">
              <MagnifyingGlass
                size={14}
                weight="duotone"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
              />
              <input
                type="text"
                placeholder="Buscar modelo..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8.5 pr-4 py-2 text-xs rounded-lg border border-border/60 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/40 transition"
              />
            </div>

            <div className="space-y-2">
              <FilterRow
                label="Proveedor"
                options={categories}
                active={categoryFilter}
                onSelect={handleCategory}
                labelMap={categoryLabels}
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

          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              {searchQuery ? (
                <MagnifyingGlassMinus
                  size={28}
                  weight="duotone"
                  className="text-muted-foreground/40"
                />
              ) : (
                <CloudSlash
                  size={28}
                  weight="duotone"
                  className="text-muted-foreground/40"
                />
              )}
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
                    {provider === 'groq' && (
                      <span className="font-normal normal-case tracking-normal text-muted-foreground/40">
                        · gratuito
                      </span>
                    )}
                  </p>
                  <div className="space-y-0.5">
                    {models.map((m: unknown) => {
                      const model = m as {
                        provider: string
                        model_id: string
                        label?: string
                        curated?: boolean
                        modality?: string
                        category?: string
                        context_length?: number
                      }
                      const key = `${model.provider}:${model.model_id}`
                      const locked = isDefaultModel(
                        model.provider,
                        model.model_id,
                      )
                      return (
                        <ModelCatalogRow
                          key={key}
                          model={model}
                          locked={locked}
                          enabled={
                            isModelEnabled(model.provider, model.model_id) ||
                            locked
                          }
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
