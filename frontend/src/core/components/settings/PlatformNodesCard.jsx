import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { useAdminNodesConfig } from '@/features/admin/hooks/useAdminNodesConfig.js'
import { criticRoundsVisible, hasUnsavedChanges } from '@/core/lib/nodesConfigDraft.js'

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

function NodeBadge({ node, videoWarning }) {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500'
  ]
  const color = videoWarning ? 'bg-amber-500' : colors[node.name.length % colors.length]
  const initials = node.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
  
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
      <div className={`h-10 w-10 rounded-2xl shrink-0 ${color} shadow-sm border border-black/10 flex items-center justify-center`}>
        <span className="text-white text-sm font-bold uppercase">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          {node.name}
          {videoWarning && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-amber-200">⚠ API Key faltante</span>}
        </p>
        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{node.description || 'Nodo base del sistema.'}</p>
      </div>
      <span className="text-[10px] font-bold mr-2 text-emerald-600 tracking-widest uppercase bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-sm">
        Siempre activo
      </span>
    </div>
  )
}

function ConfigurableRow({ node, value, showParam, rounds, onChange, onRoundsChange, disabled }) {
  const isOn = value === '1'
  const initials = node.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-2xl shrink-0 bg-primary shadow-sm border border-primary/20 flex items-center justify-center">
          <span className="text-white text-sm font-bold uppercase">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{node.name}</span>
            <span className="text-[9px] font-bold text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5 border border-border/50 tracking-widest uppercase">{node.role}</span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5 leading-snug">{node.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 mt-3 sm:mt-0">
        {node.param && showParam && (
          <div className="flex items-center gap-2 bg-muted/20 px-3 py-1.5 rounded-xl border border-border/50 shadow-sm">
            <label htmlFor={`rounds-${node.id}`} className="text-xs font-bold text-muted-foreground">
              {node.param.label}
            </label>
            <input
              id={`rounds-${node.id}`}
              type="number"
              min={node.param.min}
              max={node.param.max}
              value={rounds}
              onChange={(e) => onRoundsChange(Number(e.target.value))}
              disabled={disabled}
              className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm font-mono font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold tracking-widest uppercase ${isOn ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {isOn ? 'Activo' : 'Pausado'}
          </span>
          <Toggle checked={isOn} onChange={(v) => onChange(v ? '1' : '0')} disabled={disabled} />
        </div>
      </div>
    </div>
  )
}

export function PlatformNodesCard() {
  const { config, save } = useAdminNodesConfig()
  const [draft, setDraft] = useState(null)
  const [rounds, setRounds] = useState(1)

  const data = config.data

  useEffect(() => {
    if (data) {
      setDraft({ ...data.config })
      setRounds(data.config.ova_reflection_rounds ?? 1)
    }
  }, [data])

  const hasChanges = hasUnsavedChanges(draft, data?.config, rounds)

  const handleSave = () => {
    save.mutate(
      { ...draft, ova_reflection_rounds: rounds },
      {
        onSuccess: () => toast.success('Configuración de nodos guardada.'),
        onError: (e) => toast.error(e.message || 'No se pudo guardar.'),
      },
    )
  }

  const alwaysOnNodes = (data?.nodes ?? []).filter((n) => n.always_on && n.id !== 'video')
  const videoNode = (data?.nodes ?? []).find((n) => n.id === 'video')
  const configurableNodes = (data?.nodes ?? []).filter((n) => n.configurable)
  const videoWarning = data ? !data.video_api_key_configured : false

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Nodos del orquestador</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Activa o desactiva agentes del grafo de generación. Los cambios aplican en ~30s.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || save.isPending} className="shadow-md font-bold">
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
          {config.error?.message || 'No se pudo cargar la configuración de nodos.'}
        </p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden glass-card">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Configurables ({configurableNodes.length})</p>
            </div>
            <div className="flex flex-col">
              {configurableNodes.map((node) => (
                <ConfigurableRow
                  key={node.id}
                  node={node}
                  value={draft[node.flag] ?? node.default}
                  showParam={node.param ? criticRoundsVisible(draft) : false}
                  rounds={rounds}
                  onChange={(v) => setDraft((d) => ({ ...d, [node.flag]: v }))}
                  onRoundsChange={setRounds}
                  disabled={save.isPending}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden glass-card">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Siempre activos ({alwaysOnNodes.length + (videoNode ? 1 : 0)})</p>
            </div>
            <div className="flex flex-col">
              {alwaysOnNodes.map((n) => (
                <NodeBadge key={n.id} node={n} videoWarning={false} />
              ))}
              {videoNode && (
                <NodeBadge key="video" node={videoNode} videoWarning={videoWarning} />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
