import type { ReactNode } from 'react'
import { OvaStatusBadge } from '@/core/components/OvaStatusBadge'
import { Checkbox } from '@/core/components/ui/checkbox'
import type { OvaListItem } from '@/features/ova_library/lib/types'

interface OvaCardShellProps {
  ova: OvaListItem
  isSelected: boolean
  onToggleSelect: (id: string) => void
  checkboxDisabled?: boolean
  /** Etiqueta que precede la fecha (ej. "Creado el", "Eliminado el") */
  dateLabel?: string
  /** Fecha ISO a mostrar */
  dateValue?: string
  /** Clase CSS extra para la fecha (ej. texto rojo para papelera) */
  dateClassName?: string
  /** Badges adicionales junto al título (ej. versión, progreso) */
  extraBadges?: ReactNode
  /** Sección de botones en el footer */
  footer: ReactNode
  /** Clase del contenedor raíz */
  rootClassName?: string
}

/**
 * Estructura compartida de tarjeta OVA:
 *   Checkbox + header (título + status badge + extra badges)
 *   + body (descripción + owner + fecha)
 *   + footer slot.
 */
export function OvaCardShell({
  ova,
  isSelected,
  onToggleSelect,
  checkboxDisabled = false,
  dateLabel,
  dateValue,
  dateClassName = 'text-muted-foreground',
  extraBadges,
  footer,
  rootClassName,
}: OvaCardShellProps) {
  const defaultRoot = `rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition ${
    isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
  }`

  return (
    <div className={rootClassName ?? defaultRoot}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(ova.id)}
          disabled={checkboxDisabled}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {ova.title}
            </h3>
            <OvaStatusBadge status={ova.status} />
            {extraBadges}
          </div>
          {ova.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {ova.description as string}
            </p>
          ) : null}
          {ova.owner ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Por:{' '}
              <span className="font-medium text-foreground">
                {(ova.owner as { full_name?: string }).full_name}
              </span>
            </p>
          ) : null}
          {dateValue !== undefined ? (
            <p className={`mt-1.5 text-xs ${dateClassName}`}>
              {dateLabel ? `${dateLabel} ` : ''}
              {dateValue}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
        {footer}
      </div>
    </div>
  )
}
