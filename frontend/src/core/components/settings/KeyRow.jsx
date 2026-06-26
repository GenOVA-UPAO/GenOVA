import { useRef, useState } from 'react'
import { Eye, EyeSlash, Trash } from '@phosphor-icons/react'
import { Button } from '@/core/components/ui/button'
import { saveApiKey } from '@/features/ova_workspace/services/ovaSettingsService'

const PROVIDER_META = {
  groq: { label: 'Groq', placeholder: 'gsk_...', href: 'https://console.groq.com/keys' },
  openrouter: { label: 'OpenRouter', placeholder: 'sk-or-...', href: 'https://openrouter.ai/keys' },
  opencode: { label: 'OpenCode Go', placeholder: 'oc_...', href: 'https://opencode.ai' },
  siliconflow: { label: 'SiliconFlow', placeholder: 'sk-...', href: 'https://cloud.siliconflow.cn' },
  runware: { label: 'Runware', placeholder: '...', href: 'https://runware.ai/account/api-keys' },
  falai: { label: 'fal.ai', placeholder: '...', href: 'https://fal.ai/keys' },
}

export function KeyRow({ provider, maskedValue, onSaved }) {
  const meta = PROVIDER_META[provider] ?? { label: provider, placeholder: '...', href: '#' }
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
      const result = await saveApiKey(provider, value.trim())
      onSaved(result.api_keys)
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
      const result = await saveApiKey(provider, '')
      onSaved(result.api_keys)
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
            <span className="text-xs text-muted-foreground italic">(usa key de plataforma)</span>
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

      {!editing && (
        <p className="text-xs text-muted-foreground">
          Obtén tu key en{' '}
          <a href={meta.href} target="_blank" rel="noopener noreferrer" className="underline">
            {meta.href.replace(/^https?:\/\//, '')}
          </a>
        </p>
      )}
    </div>
  )
}
