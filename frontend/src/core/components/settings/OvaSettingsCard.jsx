import { useEffect, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { getOvaSettings, saveOvaSettings } from '@/features/ova_workspace/services/ovaSettingsService.js'
import { apiJson } from '@/core/lib/http.js'

const PROVIDER_LABELS = {
  huggingface: 'HuggingFace (predeterminado)',
  siliconflow: 'SiliconFlow',
  runware: 'Runware',
  falai: 'fal.ai',
}

async function fetchImageModels(provider) {
  try {
    const data = await apiJson(`/api/users/me/image-models?provider=${provider}`)
    return data.models ?? []
  } catch {
    return []
  }
}

export function OvaSettingsCard() {
  const [maxImages, setMaxImages] = useState(2)
  const [imageProvider, setImageProvider] = useState('huggingface')
  const [imageModel, setImageModel] = useState(null)
  const [providers, setProviders] = useState([])
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getOvaSettings()
      .then(({ settings, image_providers }) => {
        setMaxImages(settings.max_images ?? 2)
        setImageProvider(settings.image_provider ?? 'huggingface')
        setImageModel(settings.image_model ?? null)
        setProviders(image_providers ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    setLoadingModels(true)
    fetchImageModels(imageProvider)
      .then((m) => {
        setModels(m)
        if (m.length > 0 && !m.find((x) => x.id === imageModel)) {
          setImageModel(m[0].id)
        }
      })
      .finally(() => setLoadingModels(false))
  }, [imageProvider]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await saveOvaSettings({
        max_images: maxImages,
        image_provider: imageProvider,
        image_model: imageModel,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Generación de imágenes</h2>
        <p className="text-sm text-muted-foreground">
          Controla cuántas imágenes se generan en tus OVAs y qué proveedor usarlas.
        </p>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="max-images">
              Imágenes por recurso ENGAGE
            </label>
            <div className="flex items-center gap-3">
              <input
                id="max-images"
                type="range"
                min={0}
                max={10}
                value={maxImages}
                onChange={(e) => setMaxImages(Number(e.target.value))}
                className="w-48 accent-primary"
              />
              <span className="text-sm tabular-nums w-4">{maxImages}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              0 = sin imágenes. Más imágenes incrementa el tiempo de generación.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="image-provider">
              Proveedor de imágenes
            </label>
            <select
              id="image-provider"
              value={imageProvider}
              onChange={(e) => { setImageProvider(e.target.value); setImageModel(null) }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {providers.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p] ?? p}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Requiere API key del proveedor configurada en la sección siguiente.
            </p>
          </div>

          {imageProvider !== 'huggingface' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="image-model">
                Modelo de imagen
              </label>
              {loadingModels ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              ) : models.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Configura una API key de {PROVIDER_LABELS[imageProvider]} para ver modelos disponibles.
                </p>
              ) : (
                <select
                  id="image-model"
                  value={imageModel ?? ''}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary">Configuración guardada.</p>}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
