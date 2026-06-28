import { BookBookmark } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/core/components/ui/button'
import { useModalDismiss } from '@/core/hooks/useModalDismiss'
import type { ConfigField } from '@/features/ova_library/lib/resourceConfigSchema'
import { getSchema } from '@/features/ova_library/lib/resourceConfigSchema'
import { RESOURCE_ICONS } from '@/features/ova_library/lib/resourceIcons'
import type { Resource } from '@/features/student/lib/types'

interface ResourceConfigModalProps {
  resource: Resource
  phaseKey: string
  phaseColor: string
  videoKeyConfigured: boolean
  config: Record<string, number>
  onSave: (
    phaseKey: string,
    resource: Resource,
    values: Record<string, number>,
  ) => void
  onClose: () => void
}

export function ResourceConfigModal({
  resource,
  phaseKey,
  phaseColor,
  videoKeyConfigured,
  config,
  onSave,
  onClose,
}: ResourceConfigModalProps) {
  const key = `${phaseKey}:${resource.id}`
  const schema: ConfigField[] = getSchema(phaseKey, String(resource.id))
  const Icon = (RESOURCE_ICONS[key] ?? BookBookmark) as ComponentType<{
    size: number
    weight: string
    style?: React.CSSProperties
  }>
  useModalDismiss(onClose)

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const f of schema) init[f.key] = config?.[f.key] ?? f.default
    return init
  })

  function set(fieldKey: string, val: number) {
    setValues((prev) => ({ ...prev, [fieldKey]: val }))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ pointerEvents: 'auto' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 bg-background rounded-2xl shadow-2xl w-full sm:max-w-sm flex flex-col overflow-hidden border border-border">
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          <div
            className="p-2 rounded-xl shrink-0"
            style={{ backgroundColor: `${phaseColor}18` }}
          >
            <Icon size={20} weight="duotone" style={{ color: phaseColor }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground leading-tight">
              {resource.tipo}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Configurar recurso
            </p>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto max-h-[60vh]">
          {schema.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este recurso no tiene opciones configurables.
            </p>
          ) : (
            schema.map((field) => {
              const disabled = field.requiresVideo && !videoKeyConfigured
              return (
                <div
                  key={field.key}
                  className={`flex flex-col gap-1.5 ${disabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor={field.key}
                      className="text-sm font-medium text-foreground"
                    >
                      {field.label}
                    </label>
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: phaseColor }}
                    >
                      {values[field.key]}
                    </span>
                  </div>
                  <input
                    id={field.key}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={1}
                    value={values[field.key]}
                    disabled={disabled}
                    onChange={(e) => set(field.key, Number(e.target.value))}
                    className="w-full accent-current"
                    style={{ accentColor: phaseColor }}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{field.min}</span>
                    <span>{field.max}</span>
                  </div>
                  {field.description && (
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {field.description}
                    </p>
                  )}
                  {disabled && (
                    <p className="text-[11px] text-amber-600">
                      Sin API key de video configurada
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(phaseKey, resource, values)
              onClose()
            }}
            style={{ backgroundColor: phaseColor, borderColor: phaseColor }}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
