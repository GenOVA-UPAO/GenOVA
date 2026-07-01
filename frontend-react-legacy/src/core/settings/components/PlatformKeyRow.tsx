// Fila editable de una API key de plataforma (un proveedor) + metadata de
// proveedores. Extraído de PlatformApiKeysCard para mantener archivos ≤200 líneas.
import { Eye, EyeSlash, Trash } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { PROVIDER_META } from '@/core/settings/components/platformKeyMeta'
import { Button } from '@/core/components/ui/button'
import { savePlatformConfigKey } from '@/features/admin/services/adminSettingsService'

export function PlatformKeyRow({
  provider,
  maskedValue,
  onSaved,
}: {
  provider: string
  maskedValue?: string
  onSaved: (updated: Record<string, string>) => void
}) {
  const meta = PROVIDER_META[provider] ?? {
    label: provider,
    placeholder: '...',
    desc: 'Proveedor genérico',
    compat: false,
  }
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      const result = (await savePlatformConfigKey(provider, value.trim())) as {
        platform_config: Record<string, string>
      }
      onSaved(result.platform_config)
      setEditing(false)
      setValue('')
    } catch (e) {
      setRowError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    setRowError(null)
    try {
      const result = (await savePlatformConfigKey(provider, '')) as {
        platform_config: Record<string, string>
      }
      onSaved(result.platform_config)
    } catch (e) {
      setRowError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const isConfigured = !!maskedValue

  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/20 transition glass-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-base font-display">{meta.label}</p>
            {meta.compat && (
              <span className="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-widest">
                Compatible OpenAI
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            {meta.desc}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border shadow-sm ${isConfigured ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border/50'}`}
        >
          {isConfigured ? 'Conectado' : 'Sin configurar'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type={show ? 'text' : 'password'}
            value={editing ? value : maskedValue || ''}
            onChange={(e) => editing && setValue(e.target.value)}
            placeholder={meta.placeholder}
            readOnly={!editing}
            className={`w-full rounded-xl border border-border/50 px-4 py-2.5 text-xs font-mono outline-none transition ${editing ? 'bg-background focus:ring-2 focus:ring-primary/20 shadow-sm' : 'bg-muted/30 text-muted-foreground'}`}
            onKeyDown={(e) => e.key === 'Enter' && editing && handleSave()}
          />
          <button
            type="button"
            onClick={() => editing && setShow((s) => !s)}
            disabled={!editing}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${editing ? 'text-primary hover:text-primary/80 cursor-pointer' : 'text-muted-foreground/50'}`}
          >
            {show ? (
              <EyeSlash size={16} weight="bold" />
            ) : (
              <Eye size={16} weight="bold" />
            )}
          </button>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !value.trim()}
                className="shadow-sm font-bold w-full sm:w-auto"
              >
                {saving ? '…' : 'Guardar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setValue('')
                }}
                className="shadow-sm w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant={isConfigured ? 'outline' : 'default'}
                onClick={startEdit}
                disabled={saving}
                className={`shadow-sm w-full sm:w-auto ${!isConfigured && 'font-bold'}`}
              >
                {isConfigured ? 'Cambiar' : 'Configurar'}
              </Button>
              {isConfigured && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={saving}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm w-full sm:w-auto"
                >
                  <Trash size={16} weight="bold" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {rowError && (
        <p className="text-xs font-bold text-destructive flex items-center gap-1">
          ⚠ {rowError}
        </p>
      )}
    </div>
  )
}

