import { m as motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TASK_META, type TaskType } from '@/core/settings/lib/taskMeta'
import { useImageModels } from '@/features/ova_workspace/hooks/useImageModels'
import {
  getOvaSettings,
  saveOvaSettings,
} from '@/features/ova_workspace/services/ovaSettingsService'

interface MediaTaskCardProps {
  task: string
  index?: number
}

const IMAGE_PROVIDERS = [
  { value: 'huggingface', label: 'HuggingFace (gratis)' },
  { value: 'siliconflow', label: 'SiliconFlow' },
  { value: 'runware', label: 'Runware' },
  { value: 'falai', label: 'fal.ai' },
]

export function MediaTaskCard({ task, index = 0 }: MediaTaskCardProps) {
  const m = TASK_META[task as TaskType]
  const [enabled, setEnabled] = useState(true)
  const [provider, setProvider] = useState('huggingface')
  const [imageModel, setImageModel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(task !== 'imagen')

  const { data: models = [], isFetching: loadingModels } = useImageModels(
    provider,
    loaded && enabled && task === 'imagen',
  )

  useEffect(() => {
    if (task !== 'imagen') return
    getOvaSettings()
      .then((result: unknown) => {
        const { settings } = result as {
          settings: { image_provider?: string; image_model?: string }
        }
        const p = settings.image_provider ?? 'huggingface'
        setEnabled(p !== 'none')
        setProvider(p === 'none' ? 'huggingface' : p)
        setImageModel(settings.image_model ?? null)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [task])

  useEffect(() => {
    if (
      models.length > 0 &&
      !models.find((x: { id: string }) => x.id === imageModel)
    ) {
      setImageModel(models[0].id)
    }
  }, [models])

  async function persist(
    nextEnabled: boolean,
    nextProvider: string,
    nextModel: string | null,
  ) {
    setSaving(true)
    try {
      await saveOvaSettings({
        image_provider: nextEnabled ? nextProvider : 'none',
        image_model: nextEnabled ? nextModel : null,
      })
    } catch {
      toast.error('No se pudo guardar la configuración de imágenes')
    } finally {
      setSaving(false)
    }
  }

  function toggleEnabled() {
    const next = !enabled
    setEnabled(next)
    persist(next, provider, imageModel)
  }

  function changeProvider(p: string) {
    setProvider(p)
    setImageModel(null)
    persist(true, p, null)
  }

  function changeModel(mid: string) {
    setImageModel(mid)
    persist(true, provider, mid)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.07,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md hover:border-border transition duration-200"
    >
      <div
        className={`bg-gradient-to-br ${m.grad} px-5 pt-4 pb-3.5 border-b border-border/40`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`shrink-0 rounded-xl border p-2.5 shadow-sm ${m.iconBg}`}
            >
              <m.Icon size={18} weight="duotone" className={m.accent} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">
                {m.label}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-medium truncate">
                {m.desc}
              </p>
            </div>
          </div>
          {task === 'imagen' && loaded && (
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={saving}
              onClick={toggleEnabled}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
                transition-colors duration-200 focus-visible:outline-none
                ${enabled ? 'bg-primary' : 'bg-input'}
                ${saving ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200
                ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 min-h-[88px] flex flex-col justify-center">
        {task === 'imagen' ? (
          !loaded ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-xs text-muted-foreground">Cargando...</p>
            </div>
          ) : enabled ? (
            <div className="space-y-2.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/50 mb-1.5">
                  Proveedor
                </p>
                <select
                  value={provider}
                  onChange={(e) => changeProvider(e.target.value)}
                  disabled={saving}
                  className="w-full text-xs rounded-lg border border-border/60 bg-background px-3 py-2
                    focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground
                    disabled:opacity-50 cursor-pointer"
                >
                  {IMAGE_PROVIDERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {loadingModels ? (
                <div className="flex items-center gap-1.5 py-1">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary" />
                  <p className="text-[10px] text-muted-foreground">
                    Cargando modelos...
                  </p>
                </div>
              ) : models.length > 0 ? (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/50 mb-1.5">
                    Modelo
                  </p>
                  <select
                    value={imageModel ?? ''}
                    onChange={(e) => changeModel(e.target.value)}
                    disabled={saving}
                    className="w-full text-xs rounded-lg border border-border/60 bg-background px-3 py-2
                      focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground
                      disabled:opacity-50 cursor-pointer"
                  >
                    {models.map((opt: { id: string; label?: string }) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label || opt.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                Sin imágenes AI en OVA
              </p>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${m.badge}`}
            >
              Sin modelo IA
            </span>
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Los videos se integran mediante búsqueda de contenido embebido. No
              requiere generación IA.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
