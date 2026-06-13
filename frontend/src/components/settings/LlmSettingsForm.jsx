import { Lock } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatContextLength, PROVIDER_LABELS } from '../../lib/llmCatalogUtils.js'

/**
 * Reusable body for the per-user LLM config (general, applies to all OVAs).
 * Presentational — driven by a `useLlmSettings()` hook passed in `hook`, so the
 * SAME form is mounted in the workspace modal and in the profile page.
 */
export function LlmSettingsForm({ hook, readOnly = false }) {
  const {
    settings, catalog, catalogStatus, bounds, loading, saving,
    taskLabels, setModel, setTipoTimeout, resetTipo,
  } = hook
  const [tmin, tmax] = bounds
  const disabled = saving || readOnly

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {readOnly ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Lock weight="duotone" size={14} className="mt-0.5 shrink-0" />
          <span>
            Modelos asignados por el administrador.{' '}
            <span className="font-medium text-foreground">Añade una API key</span>{' '}
            en Mi Perfil → API Keys para personalizar.
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Configuración general de IA: aplica a <strong>todos</strong> tus OVAs (no por OVA ni por recurso).
          El modelo de <strong>Código / HTML interactivo</strong> es el que genera los recursos visuales.
        </p>
      )}

      {Object.entries(taskLabels).map(([tipo, label]) => {
        const cur = settings[tipo] || {}
        const value = cur.provider && cur.model_id ? `${cur.provider}::${cur.model_id}` : ''
        return (
          <div key={tipo} className="rounded-lg border border-border p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </Label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => resetTipo(tipo)}
                  disabled={saving}
                  className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Restaurar por defecto
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Modelo</Label>
                <Select
                  value={value}
                  onValueChange={(v) => {
                    const [provider, ...rest] = v.split('::')
                    setModel(tipo, provider, rest.join('::'))
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Elige un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(catalog).map(([provider, models]) => {
                      const providerDown = catalogStatus?.[provider]?.ok === false
                      return (
                        <SelectGroup key={provider}>
                          <SelectLabel className={providerDown ? 'text-muted-foreground/50' : ''}>
                            {PROVIDER_LABELS[provider] || provider}
                            {providerDown && ' (no disponible)'}
                          </SelectLabel>
                          {(Array.isArray(models) ? models : []).map((m) => {
                            const modelId = typeof m === 'string' ? m : m.model_id
                            const label = typeof m === 'string' ? m : (m.label || m.model_id)
                            const pricing = typeof m === 'string' ? null : m.pricing
                            const ctx = typeof m === 'string' ? null : formatContextLength(m.context_length)
                            return (
                              <SelectItem key={`${provider}::${modelId}`} value={`${provider}::${modelId}`} className="text-xs">
                                <span className="flex items-center gap-2 w-full">
                                  <span className="truncate">{label}</span>
                                  {(pricing || ctx) && (
                                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
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
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Timeout (s)</Label>
                <Input
                  type="number"
                  min={tmin}
                  max={tmax}
                  value={cur.timeout_s ?? ''}
                  disabled={disabled}
                  onChange={(e) => setTipoTimeout(tipo, Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-muted-foreground">Timeout permitido: {tmin}–{tmax} s por llamada.</p>
    </div>
  )
}
