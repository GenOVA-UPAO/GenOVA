import { Article, Brain, Code, Lock, Robot } from '@phosphor-icons/react'
import { Input } from '@/core/components/ui/input'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/core/components/ui/select'
import { formatContextLength, PROVIDER_LABELS } from '@/core/lib/llm/llmCatalogUtils'

/**
 * Task-type → model assignment. Each card is colour-coded by role so the user
 * can scan the config at a glance (azul=texto, naranja=código, etc.).
 * `readOnly` disables all controls and shows a lock banner.
 */
const TASK_VISUAL = {
  texto:        { Icon: Article, bar: 'bg-primary',      tint: 'bg-primary/[.04]'      },
  codigo:       { Icon: Code,    bar: 'bg-accent-brand', tint: 'bg-accent-brand/[.04]' },
  orquestador:  { Icon: Robot,   bar: 'bg-primary/60',      tint: 'bg-primary/[.04]'      },
  razonamiento: { Icon: Brain,   bar: 'bg-accent-brand/60', tint: 'bg-accent-brand/[.04]' },
}

export function LlmSettingsForm({ hook, readOnly = false }) {
  const {
    settings, catalog, catalogStatus, bounds, loading, saving,
    taskLabels, setModel, setTipoTimeout, resetTipo,
  } = hook
  const [tmin, tmax] = bounds
  const locked = saving || readOnly

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <Lock weight="duotone" size={13} className="shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Configurado por el administrador.{' '}
            <span className="font-semibold text-foreground">Añade una API key</span>
            {' '}en Mi Perfil → API Keys para personalizar.
          </p>
        </div>
      )}

      {Object.keys(taskLabels).map((tipo) => {
        const cur = settings[tipo] || {}
        const value = cur.provider && cur.model_id ? `${cur.provider}::${cur.model_id}` : ''
        const { Icon, bar = 'bg-border', tint = '' } = TASK_VISUAL[tipo] || {}

        return (
          <div
            key={tipo}
            className={`relative overflow-hidden rounded-xl border border-border/70 transition-shadow hover:shadow-sm ${tint}`}
          >
            <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${bar}`} />

            <div className="pl-5 pr-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {Icon && <Icon weight="duotone" size={13} className="text-muted-foreground" />}
                  <span className="text-[10px] font-bold uppercase tracking-[.09em] text-muted-foreground">
                    {taskLabels[tipo]}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => resetTipo(tipo)}
                    disabled={saving}
                    className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors disabled:opacity-30"
                  >
                    Restaurar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={value}
                  onValueChange={(v) => {
                    const [p, ...r] = v.split('::')
                    setModel(tipo, p, r.join('::'))
                  }}
                  disabled={locked}
                >
                  <SelectTrigger className="h-8 flex-1 min-w-0 text-xs border-border/50 bg-background/70">
                    <SelectValue placeholder="Elige un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(catalog).map(([provider, models]) => {
                      const down = catalogStatus?.[provider]?.ok === false
                      return (
                        <SelectGroup key={provider}>
                          <SelectLabel className={`text-[10px] ${down ? 'opacity-40' : ''}`}>
                            {PROVIDER_LABELS[provider] || provider}
                            {down && ' · no disponible'}
                          </SelectLabel>
                          {(Array.isArray(models) ? models : []).map((m) => {
                            const mid = typeof m === 'string' ? m : m.model_id
                            const mlabel = typeof m === 'string' ? m : (m.label || m.model_id)
                            const pricing = typeof m === 'string' ? null : m.pricing
                            const ctx = typeof m === 'string' ? null : formatContextLength(m.context_length)
                            return (
                              <SelectItem
                                key={`${provider}::${mid}`}
                                value={`${provider}::${mid}`}
                                className="text-xs"
                              >
                                <span className="flex items-center gap-2 w-full">
                                  <span className="truncate">{mlabel}</span>
                                  {(pricing || ctx) && (
                                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
                                      {[pricing, ctx].filter(Boolean).join(' · ')}
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectGroup>
                      )
                    })}
                  </SelectContent>
                </Select>

                <div className="flex shrink-0 items-center gap-1">
                  <Input
                    type="number"
                    min={tmin}
                    max={tmax}
                    value={cur.timeout_s ?? ''}
                    disabled={locked}
                    onChange={(e) => setTipoTimeout(tipo, Number(e.target.value))}
                    className="h-8 w-14 text-center text-xs border-border/50 bg-background/70"
                    title={`Timeout: ${tmin}–${tmax} s`}
                  />
                  <span className="text-[10px] text-muted-foreground/40">s</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <p className="text-[10px] text-muted-foreground/50 px-0.5">
        Timeout: {tmin}–{tmax} s · aplica a todos tus OVAs
      </p>
    </div>
  )
}
