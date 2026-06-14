import { useEffect, useRef, useState } from 'react'
import { Eye, EyeSlash, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { getPlatformConfig, savePlatformConfigKey } from '../../services/ovaSettingsService.js'

const PROVIDER_META = {
  groq: { label: 'Groq', placeholder: 'gsk_...' },
  openrouter: { label: 'OpenRouter', placeholder: 'sk-or-...' },
  opencode: { label: 'OpenCode Go', placeholder: 'oc_...' },
  siliconflow: { label: 'SiliconFlow', placeholder: 'sk-...' },
  runware: { label: 'Runware', placeholder: '...' },
  falai: { label: 'fal.ai', placeholder: '...' },
}

function PlatformKeyRow({ provider, maskedValue, onSaved }) {
  const meta = PROVIDER_META[provider] ?? { label: provider, placeholder: '...' }
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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground shrink-0">{meta.label}</span>
          {maskedValue ? (
            <span className="font-mono text-xs text-muted-foreground truncate">{maskedValue}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic">(no configurada)</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {maskedValue && !editing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
              title="Eliminar key"
            >
              <Trash size={14} weight="duotone" />
            </button>
          )}
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit} disabled={saving}>
              {maskedValue ? 'Cambiar' : 'Configurar'}
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 pr-8 text-sm font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeSlash size={14} weight="duotone" /> : <Eye size={14} weight="duotone" />}
            </button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || !value.trim()}>
            {saving ? '…' : 'Guardar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue('') }}>
            Cancelar
          </Button>
        </div>
      )}

      {rowError && <p className="text-xs text-destructive">{rowError}</p>}
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
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">API Keys de plataforma</h2>
        <p className="text-sm text-muted-foreground">
          Keys globales usadas cuando los usuarios no tienen la suya propia. Solo admins pueden
          modificarlas.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="divide-y divide-border space-y-4">
          {providers.map((p) => (
            <div key={p} className="pt-4 first:pt-0">
              <PlatformKeyRow
                provider={p}
                maskedValue={platformConfig[p]}
                onSaved={(updated) => setPlatformConfig(updated)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
