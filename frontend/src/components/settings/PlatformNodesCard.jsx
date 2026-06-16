import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAdminNodesConfig } from '../../hooks/admin/useAdminNodesConfig.js'
import { criticRoundsVisible, hasUnsavedChanges } from '../../lib/nodesConfigDraft.js'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-primary' : 'bg-input'}`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg
          transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

function NodeBadge({ node, videoWarning }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${videoWarning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
      <span className="font-medium text-foreground">{node.name}</span>
      {videoWarning && <span className="text-amber-600">⚠</span>}
    </div>
  )
}

function ConfigurableRow({ node, value, showParam, rounds, onChange, onRoundsChange, disabled }) {
  const isOn = value === '1'
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{node.name}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded px-1.5">{node.role}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{node.description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {node.param && showParam && (
          <div className="flex items-center gap-1.5">
            <label htmlFor={`rounds-${node.id}`} className="text-xs text-muted-foreground">
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
              className="w-14 rounded-md border border-border bg-background px-2 py-1 text-sm text-center"
            />
          </div>
        )}
        <Toggle checked={isOn} onChange={(v) => onChange(v ? '1' : '0')} disabled={disabled} />
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
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Nodos / Agentes Prometheus</h2>
          <p className="text-sm text-muted-foreground">
            Activa o desactiva agentes del grafo de generación. Los cambios aplican en ~30s.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>

      {config.isLoading || !draft ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : config.isError ? (
        <p className="text-sm text-destructive">
          {config.error?.message || 'No se pudo cargar la configuración de nodos.'}
        </p>
      ) : (
        <>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Siempre activos
            </p>
            <div className="flex flex-wrap gap-2">
              {alwaysOnNodes.map((n) => (
                <NodeBadge key={n.id} node={n} videoWarning={false} />
              ))}
              {videoNode && (
                <NodeBadge key="video" node={videoNode} videoWarning={videoWarning} />
              )}
            </div>
            {videoWarning && (
              <p className="text-xs text-amber-600 mt-1.5">
                Sin API key de video configurada — los recursos de video generarán un prompt copiable.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Configurables
            </p>
            <div>
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

          <p className="text-xs text-muted-foreground">
            Cambios aplican en ~30s (TTL de caché por worker).
          </p>
        </>
      )}
    </section>
  )
}
