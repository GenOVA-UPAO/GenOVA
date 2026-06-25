import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { useAdminNodesConfig } from '@/features/admin/hooks/useAdminNodesConfig.js'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function CapabilityRow({ cap, value, onChange, videoWarning, disabled }) {
  const initials = cap.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const isOn = value === '1'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-2xl shrink-0 bg-primary/80 shadow-sm border border-primary/20 flex items-center justify-center">
          <span className="text-white text-sm font-bold uppercase">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{cap.name}</span>
            <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5 border border-border/50 tracking-widest uppercase">{cap.role}</span>
            {videoWarning && (
              <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-amber-200">⚠ API Key faltante</span>
            )}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-snug">{cap.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {cap.always_on ? (
          <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-sm">
            Siempre activo
          </span>
        ) : (
          <>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${isOn ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {isOn ? 'Activo' : 'Pausado'}
            </span>
            <Toggle checked={isOn} onChange={(v) => onChange(v ? '1' : '0')} disabled={disabled} />
          </>
        )}
      </div>
    </div>
  )
}

export function PlatformCapabilitiesCard() {
  const { config, save } = useAdminNodesConfig()
  const [draft, setDraft] = useState(null)

  const data = config.data
  const capabilities = data?.capabilities ?? []

  useEffect(() => {
    if (data) setDraft({ ...data.config })
  }, [data])

  const videoWarning = data ? !data.video_api_key_configured : false
  const configurableCaps = capabilities.filter((c) => c.configurable)
  const hasChanges = draft && configurableCaps.some(
    (c) => String(draft[c.flag] ?? c.default) !== String(data?.config?.[c.flag] ?? c.default),
  )

  const handleSave = () => {
    const updates = {}
    for (const c of configurableCaps) {
      updates[c.flag] = draft[c.flag] ?? c.default
    }
    save.mutate(updates, {
      onSuccess: () => toast.success('Capacidades guardadas.'),
      onError: (e) => toast.error(e.message || 'No se pudo guardar.'),
    })
  }

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Capacidades de generación</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Módulos auxiliares invocados por los agentes durante la generación.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || save.isPending}
          className="shadow-md font-bold"
        >
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>

      {config.isLoading || !draft ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : config.isError ? (
        <p className="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          {config.error?.message || 'No se pudo cargar la configuración.'}
        </p>
      ) : (
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden glass-card">
          {capabilities.map((cap) => (
            <CapabilityRow
              key={cap.id}
              cap={cap}
              value={draft[cap.flag] ?? cap.default}
              videoWarning={cap.id === 'video' && videoWarning}
              onChange={(v) => setDraft((d) => ({ ...d, [cap.flag]: v }))}
              disabled={save.isPending}
            />
          ))}
        </div>
      )}
    </section>
  )
}
