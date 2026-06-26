import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchLlmSettings, refreshLlmCatalog } from '../services/llmSettingsService'
import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from '../lib/llm/llmSettingsLabels'
import type { SettingsMap } from '../lib/llm/llmSettingsMutations'
import { type EnabledModel, useEnabledModels } from './useEnabledModels'
import { useLlmSettingsEditor } from './useLlmSettingsEditor'
import type { LlmSettingsResponse, LoadOpts } from './useLlmSettings.types'

export function useLlmSettings(enabled = true) {
  const [settings, setSettings] = useState<SettingsMap | null>(null)
  const [catalog, setCatalog] = useState<Record<string, unknown[]>>({})
  const [catalogAll, setCatalogAll] = useState<unknown[]>([])
  const [catalogFull, setCatalogFull] = useState<unknown[]>([])
  const [fullTotal, setFullTotal] = useState(0)
  const [fullPage, setFullPage] = useState(1)
  const [fullHasMore, setFullHasMore] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [enabledModels, setEnabledModels] = useState<EnabledModel[]>([])
  const [defaults, setDefaults] = useState<Record<string, EnabledModel>>({})
  const [bounds, setBounds] = useState<number[]>([30, 300])
  const [hasOwnLlmKey, setHasOwnLlmKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [catalogStatus, setCatalogStatus] = useState<unknown>(null)
  const [refreshingCatalog, setRefreshingCatalog] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(
    async (opts: LoadOpts = {}) => {
      const { append = false, page: reqPage = 1, search, category, type } = opts
      const s = search !== undefined ? search : searchQuery
      const c = category !== undefined ? category : categoryFilter
      const t = type !== undefined ? type : typeFilter
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError('')
      try {
        const data = (await fetchLlmSettings({
          search: s,
          category: c,
          type: t,
          page: reqPage,
          page_size: 500,
        })) as LlmSettingsResponse
        setSettings(data.settings || {})
        setHasOwnLlmKey(data.has_own_llm_key ?? false)
        setCatalog(data.catalog || {})
        setCatalogAll(Array.isArray(data.catalog_all) ? data.catalog_all : [])
        setEnabledModels(Array.isArray(data.enabled_models) ? data.enabled_models : [])
        setDefaults(data.defaults || {})
        if (Array.isArray(data.timeout_bounds)) setBounds(data.timeout_bounds)
        if (Array.isArray(data.catalog_full)) {
          const next = data.catalog_full
          setCatalogFull((prev) => (append ? [...prev, ...next] : next))
        }
        setFullTotal(data.full_total || 0)
        setFullPage(data.full_page || 1)
        setFullHasMore(data.full_has_more || false)
        if (Array.isArray(data.categories)) setCategories(data.categories)
        if (Array.isArray(data.types)) setTypes(data.types)
        setCatalogStatus(data.catalog_status || null)
      } catch (err) {
        setError((err as Error)?.message || 'No se pudo cargar la configuración.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [searchQuery, categoryFilter, typeFilter],
  )

  useEffect(() => {
    if (enabled) void load({ search: '', category: 'all', page: 1 })
  }, [enabled, load])

  const em = useEnabledModels({ enabledModels, setEnabledModels, defaults })
  const editor = useLlmSettingsEditor(settings, setSettings, defaults)

  const loadMore = useCallback(() => {
    if (loadingMore || !fullHasMore) return
    void load({ append: true, page: fullPage + 1 })
  }, [load, fullPage, fullHasMore, loadingMore])

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => void load({ page: 1 }), 300)
    },
    [load],
  )

  const handleCategory = useCallback(
    (cat: string) => {
      setCategoryFilter(cat)
      void load({ page: 1, category: cat })
    },
    [load],
  )
  const handleType = useCallback(
    (t: string) => {
      setTypeFilter(t)
      void load({ page: 1, type: t })
    },
    [load],
  )

  const retryRefresh = useCallback(async () => {
    setRefreshingCatalog(true)
    try {
      await refreshLlmCatalog()
      await load({})
    } catch {
      toast.error('No se pudo actualizar el catálogo. Intenta de nuevo en unos segundos.')
    } finally {
      setRefreshingCatalog(false)
    }
  }, [load])

  return {
    settings,
    catalog,
    catalogAll,
    catalogFull,
    fullTotal,
    fullPage,
    fullHasMore,
    catalogEnabled: Object.values(catalog).flat(),
    enabledModels,
    defaults,
    bounds,
    categories,
    types,
    hasOwnLlmKey,
    loading,
    loadingMore,
    error,
    catalogStatus,
    refreshingCatalog,
    retryRefresh,
    searchQuery,
    categoryFilter,
    typeFilter,
    load,
    loadMore,
    handleSearch,
    handleCategory,
    handleType,
    ...editor,
    isDefaultModel: em.isDefaultModel,
    isModelEnabled: em.isModelEnabled,
    toggleFavorite: em.toggleFavorite,
    taskLabels: TASK_LABELS,
    categoryLabels: CATEGORY_LABELS,
    typeLabels: TYPE_LABELS,
  }
}
