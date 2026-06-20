import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchLlmSettings, saveLlmSettings, refreshLlmCatalog } from '../services/llmSettingsService.js'
import { TASK_LABELS, CATEGORY_LABELS, TYPE_LABELS } from '../lib/llmSettingsLabels.js'
import { useEnabledModels } from './useEnabledModels.js'

const DEFAULT_TIMEOUT = 120

export function useLlmSettings(enabled = true) {
  const [settings, setSettings] = useState(null)
  const [catalog, setCatalog] = useState({})
  const [catalogAll, setCatalogAll] = useState([])
  const [catalogFull, setCatalogFull] = useState([])
  const [fullTotal, setFullTotal] = useState(0)
  const [fullPage, setFullPage] = useState(1)
  const [fullHasMore, setFullHasMore] = useState(false)
  const [categories, setCategories] = useState([])
  const [types, setTypes] = useState([])
  const [enabledModels, setEnabledModels] = useState([])
  const [defaults, setDefaults] = useState({})
  const [bounds, setBounds] = useState([30, 300])
  const [hasOwnLlmKey, setHasOwnLlmKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [catalogStatus, setCatalogStatus] = useState(null)
  const [refreshingCatalog, setRefreshingCatalog] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const debounceRef = useRef(null)

  const load = useCallback(async (opts = {}) => {
    const { append = false, page: reqPage = 1, search, category, type } = opts
    const s = search !== undefined ? search : searchQuery
    const c = category !== undefined ? category : categoryFilter
    const t = type !== undefined ? type : typeFilter
    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const data = await fetchLlmSettings({ search: s, category: c, type: t, page: reqPage, page_size: 50 })
      setSettings(data.settings || {})
      setHasOwnLlmKey(data.has_own_llm_key ?? false)
      setCatalog(data.catalog || {})
      setCatalogAll(Array.isArray(data.catalog_all) ? data.catalog_all : [])
      setEnabledModels(Array.isArray(data.enabled_models) ? data.enabled_models : [])
      setDefaults(data.defaults || {})
      if (Array.isArray(data.timeout_bounds)) setBounds(data.timeout_bounds)
      if (Array.isArray(data.catalog_full)) {
        setCatalogFull(append ? (prev) => [...prev, ...data.catalog_full] : data.catalog_full)
      }
      setFullTotal(data.full_total || 0)
      setFullPage(data.full_page || 1)
      setFullHasMore(data.full_has_more || false)
      if (Array.isArray(data.categories)) setCategories(data.categories)
      if (Array.isArray(data.types)) setTypes(data.types)
      setCatalogStatus(data.catalog_status || null)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchQuery, categoryFilter, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (enabled) void load({ search: '', category: 'all', page: 1 })
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const em = useEnabledModels({ enabledModels, setEnabledModels, defaults, onSaved: () => load({}) })

  const loadMore = useCallback(() => {
    if (loadingMore || !fullHasMore) return
    void load({ append: true, page: fullPage + 1 })
  }, [load, fullPage, fullHasMore, loadingMore])

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void load({ page: 1 }) }, 300)
  }, [load])

  const handleCategory = useCallback((cat) => { setCategoryFilter(cat); void load({ page: 1, category: cat }) }, [load])
  const handleType = useCallback((t) => { setTypeFilter(t); void load({ page: 1, type: t }) }, [load])

  const retryRefresh = useCallback(async () => {
    setRefreshingCatalog(true)
    try { await refreshLlmCatalog(); await load({}) }
    catch { toast.error('No se pudo actualizar el catálogo. Intenta de nuevo en unos segundos.') }
    finally { setRefreshingCatalog(false) }
  }, [load])

  const setModel = useCallback((tipo, provider, modelId) =>
    setSettings((s) => ({ ...s, [tipo]: { ...s[tipo], provider, model_id: modelId } })), [])

  const setTipoTimeout = useCallback((tipo, timeoutS) =>
    setSettings((s) => ({ ...s, [tipo]: { ...s[tipo], timeout_s: timeoutS } })), [])

  const setFallback = useCallback((tipo, index, provider, modelId) => {
    setSettings((s) => {
      const fbs = [...(s[tipo]?.fallbacks || [])]
      if (index >= 0 && index < fbs.length) fbs[index] = { provider, model_id: modelId }
      return { ...s, [tipo]: { ...s[tipo], fallbacks: fbs } }
    })
  }, [])

  const addFallback = useCallback((tipo) =>
    setSettings((s) => ({ ...s, [tipo]: { ...s[tipo], fallbacks: [...(s[tipo]?.fallbacks || []), { provider: '', model_id: '' }] } })), [])

  const removeFallback = useCallback((tipo, index) =>
    setSettings((s) => ({ ...s, [tipo]: { ...s[tipo], fallbacks: (s[tipo]?.fallbacks || []).filter((_, i) => i !== index) } })), [])

  const moveFallback = useCallback((tipo, index, dir) => {
    setSettings((s) => {
      const fbs = [...(s[tipo]?.fallbacks || [])]
      const ni = index + dir
      if (ni < 0 || ni >= fbs.length) return s
      ;[fbs[index], fbs[ni]] = [fbs[ni], fbs[index]]
      return { ...s, [tipo]: { ...s[tipo], fallbacks: fbs } }
    })
  }, [])

  const resetTipo = useCallback((tipo) =>
    setSettings((s) => ({ ...s, [tipo]: { ...defaults[tipo], timeout_s: DEFAULT_TIMEOUT } })), [defaults])

  const save = useCallback(async () => {
    if (!settings) return false
    setSaving(true)
    try {
      const data = await saveLlmSettings(settings)
      if (data?.settings) setSettings(data.settings)
      toast.success('Configuración de IA guardada.')
      return true
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar la configuración.')
      return false
    } finally { setSaving(false) }
  }, [settings])

  return {
    settings, catalog, catalogAll, catalogFull, fullTotal, fullPage, fullHasMore,
    enabledModels, defaults, bounds, categories, types,
    hasOwnLlmKey,
    loading, loadingMore, saving, enabledSaving: em.enabledSaving, error,
    catalogStatus, refreshingCatalog, retryRefresh,
    searchQuery, categoryFilter, typeFilter,
    load, loadMore, handleSearch, handleCategory, handleType,
    setModel, setTipoTimeout, resetTipo, save,
    setFallback, addFallback, removeFallback, moveFallback,
    isDefaultModel: em.isDefaultModel, isModelEnabled: em.isModelEnabled,
    toggleModel: em.toggleModel, saveEnabled: em.saveEnabled,
    taskLabels: TASK_LABELS,
    categoryLabels: CATEGORY_LABELS,
    typeLabels: TYPE_LABELS,
  }
}
