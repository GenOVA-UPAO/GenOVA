import { useCallback, useEffect, useRef, useState } from 'react'
import { Key, MagnifyingGlass, Plus, SlidersHorizontal } from '@phosphor-icons/react'
import { Button } from '@/core/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/components/ui/dialog'
import { groupByProvider, PROVIDER_LABELS } from '@/core/lib/llm/llmCatalogUtils.js'
import { CATEGORY_LABELS } from '@/core/lib/llm/llmSettingsLabels.js'
import { ManageModelRow } from './ManageModelRow.jsx'
import { ConnectProviderModal } from './ConnectProviderModal.jsx'

export function ManageModelsModal({ open, onClose, hook, onGoToApiKeys }) {
  const {
    catalogFull, fullHasMore, categories, loading, loadingMore,
    searchQuery, categoryFilter,
    isDefaultModel, isModelEnabled, toggleFavorite,
    loadMore, handleSearch, handleCategory,
    hasOwnLlmKey,
  } = hook

  const [savingKey, setSavingKey] = useState(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => { setLocalSearch(searchQuery) }, [searchQuery])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && fullHasMore && !loadingMore && !loading) loadMore() },
      { rootMargin: '200px', root: scrollRef.current },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [fullHasMore, loadingMore, loading, loadMore])

  const handleToggle = useCallback(async (provider, modelId) => {
    const key = `${provider}:${modelId}`
    setSavingKey(key)
    await toggleFavorite(provider, modelId)
    setSavingKey(null)
  }, [toggleFavorite])

  const handleConnectSelect = (provider) => {
    setConnectOpen(false)
    onGoToApiKeys(provider)
  }

  const grouped = groupByProvider(catalogFull)

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
            <DialogHeader className="gap-0.5">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal size={15} weight="bold" className="text-primary" />
                Gestionar modelos
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">Activa los modelos que quieres usar en Asignación.</p>
            </DialogHeader>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Button size="sm" variant="outline" onClick={() => setConnectOpen(true)} className="gap-1.5 text-xs font-bold">
                <Plus size={11} weight="bold" /> Conectar proveedor
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose} className="text-xs text-muted-foreground">
                Cerrar
              </Button>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-background">
            <div className="relative flex-1">
              <MagnifyingGlass size={13} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Buscar modelo..."
                value={localSearch}
                onChange={(e) => { setLocalSearch(e.target.value); handleSearch(e.target.value) }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/60 bg-muted/30
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40
                  placeholder:text-muted-foreground/40 transition-all"
              />
            </div>
            <select
              value={categoryFilter || 'all'}
              onChange={(e) => handleCategory(e.target.value)}
              className="text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5
                focus:outline-none focus:ring-2 focus:ring-primary/20 text-muted-foreground transition-all cursor-pointer"
            >
              {(categories || []).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="max-h-[560px] overflow-y-auto">
            {!hasOwnLlmKey ? (
              <div className="flex flex-col items-center gap-4 py-14 text-center px-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                  <Key size={22} weight="duotone" className="text-muted-foreground" />
                </div>
                <div className="max-w-xs space-y-1.5">
                  <p className="text-sm font-bold text-foreground font-display">Sin API keys configuradas</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Añade una API key para ver y activar modelos.
                  </p>
                </div>
                <Button size="sm" onClick={onGoToApiKeys} className="gap-1.5 text-xs font-bold">
                  <Key size={12} weight="bold" /> Añadir API Key
                </Button>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {Object.entries(grouped).map(([provider, models]) => (
                  <div key={provider} className="px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/40 mb-1 px-2 flex items-center gap-1.5">
                      {PROVIDER_LABELS[provider] || provider}
                      {provider === 'groq' && <span className="font-normal normal-case tracking-normal text-emerald-500">· gratuito</span>}
                    </p>
                    {models.map((m) => {
                      const key = `${m.provider}:${m.model_id}`
                      const locked = isDefaultModel(m.provider, m.model_id)
                      return (
                        <ManageModelRow
                          key={key}
                          model={m}
                          locked={locked}
                          enabled={isModelEnabled(m.provider, m.model_id) || locked}
                          saving={savingKey === key}
                          onToggle={handleToggle}
                        />
                      )
                    })}
                  </div>
                ))}
                <div ref={sentinelRef} className="h-1" />
                {loadingMore ? (
                  <div className="flex justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  </div>
                ) : fullHasMore ? (
                  <div className="flex flex-col items-center gap-1.5 py-5 border-t border-border/30">
                    <p className="text-[11px] text-muted-foreground">
                      Mostrando {catalogFull.length} modelos
                    </p>
                    <Button size="sm" variant="outline" onClick={loadMore} className="text-xs font-bold gap-1.5">
                      Cargar más modelos
                    </Button>
                  </div>
                ) : catalogFull.length > 0 ? (
                  <p className="text-center text-[11px] text-muted-foreground/50 py-4">
                    {catalogFull.length} modelos en total
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConnectProviderModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onSelectProvider={handleConnectSelect}
      />
    </>
  )
}
