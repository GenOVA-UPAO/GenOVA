import { useEffect, useRef, useState } from 'react'
import { Eye, EyeSlash, Trash, Plugs } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { getPlatformConfig, savePlatformConfigKey } from '../../services/ovaSettingsService.js'

const PROVIDER_META = {
  groq: { label: 'Groq', placeholder: 'gsk_...', desc: 'LLM principal — Llama 3', compat: true },
  openrouter: { label: 'OpenRouter', placeholder: 'sk-or-...', desc: 'Fallback LLM — múltiples modelos', compat: true },
  opencode: { label: 'OpenCode Go', placeholder: 'oc_...', desc: 'Modelos especializados en código', compat: true },
  siliconflow: { label: 'SiliconFlow', placeholder: 'sk-...', desc: 'LLM / imagen — modelos open source a bajo costo', compat: true },
  runware: { label: 'Runware', placeholder: '...', desc: 'Generación de imágenes — Stable Diffusion XL', compat: false },
  falai: { label: 'fal.ai', placeholder: '...', desc: 'Inferencia rápida — imagen, video y audio en la nube', compat: false },
}

function PlatformKeyRow({ provider, maskedValue, onSaved }) {
  const meta = PROVIDER_META[provider] ?? { label: provider, placeholder: '...', desc: 'Proveedor genérico', compat: false }
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rowError, setRowError] = useState(null)
  const inputRef = useRef(null)

  function startEdit() {
    setValue('')
    setEditing(true)
    setRowError(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSave() {
    setSaving(true)
    setRowError(null)
    try {
      const result = await savePlatformConfigKey(provider, value.trim())
      onSaved(result.platform_config)
      setEditing(false)
      setValue('')
    } catch (e) {
      setRowError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    setRowError(null)
    try {
      const result = await savePlatformConfigKey(provider, '')
      onSaved(result.platform_config)
    } catch (e) {
      setRowError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const isConfigured = !!maskedValue

  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/20 transition-all glass-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-base font-display">{meta.label}</p>
            {meta.compat && <span className="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-widest">Compatible OpenAI</span>}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-1">{meta.desc}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border shadow-sm ${isConfigured ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border/50'}`}>
          {isConfigured ? 'Conectado' : 'Sin configurar'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type={show ? 'text' : 'password'}
            value={editing ? value : (maskedValue || '')}
            onChange={(e) => editing && setValue(e.target.value)}
            placeholder={meta.placeholder}
            readOnly={!editing}
            className={`w-full rounded-xl border border-border/50 px-4 py-2.5 text-xs font-mono outline-none transition-all ${editing ? 'bg-background focus:ring-2 focus:ring-primary/20 shadow-sm' : 'bg-muted/30 text-muted-foreground'}`}
            onKeyDown={(e) => e.key === 'Enter' && editing && handleSave()}
          />
          <button
            type="button"
            onClick={() => editing && setShow((s) => !s)}
            disabled={!editing}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${editing ? 'text-primary hover:text-primary/80 cursor-pointer' : 'text-muted-foreground/50'}`}
          >
            {show ? <EyeSlash size={16} weight="bold" /> : <Eye size={16} weight="bold" />}
          </button>
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving || !value.trim()} className="shadow-sm font-bold w-full sm:w-auto">
                {saving ? '…' : 'Guardar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setValue('') }} className="shadow-sm w-full sm:w-auto">
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant={isConfigured ? 'outline' : 'default'} onClick={startEdit} disabled={saving} className={`shadow-sm w-full sm:w-auto ${!isConfigured && 'font-bold'}`}>
                {isConfigured ? 'Cambiar' : 'Configurar'}
              </Button>
              {isConfigured && (
                <Button size="sm" variant="outline" onClick={handleDelete} disabled={saving} className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm w-full sm:w-auto">
                  <Trash size={16} weight="bold" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {rowError && <p className="text-xs font-bold text-destructive flex items-center gap-1">⚠ {rowError}</p>}
    </div>
  )
}

export function PlatformApiKeysCard() {
  const [platformConfig, setPlatformConfig] = useState({})
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPlatformConfig()
      .then(({ platform_config, providers: p }) => {
        setPlatformConfig(platform_config ?? {})
        setProviders(p ?? Object.keys(PROVIDER_META))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">API Keys de plataforma</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Keys globales usadas cuando los usuarios no tienen la suya propia. Solo admins pueden modificarlas.
          </p>
        </div>
        <Plugs size={32} weight="duotone" className="text-primary hidden sm:block" />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          {error}
        </p>
      ) : (
        <div className="space-y-4">
          {providers.map((p) => (
            <PlatformKeyRow
              key={p}
              provider={p}
              maskedValue={platformConfig[p]}
              onSaved={(updated) => setPlatformConfig(updated)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
