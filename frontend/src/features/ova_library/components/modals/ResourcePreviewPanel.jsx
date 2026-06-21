import { BookBookmark } from '@phosphor-icons/react'
import { RESOURCE_ICONS } from '@/features/ova_library/lib/resourceIcons.js'
import { RESOURCE_PREVIEWS } from '@/features/ova_library/lib/resourcePreviews.js'

const INTERACTIVIDAD_COLOR = {
  Alta:  'text-primary',
  Media: 'text-accent-brand',
  Baja:  'text-muted-foreground',
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <BookBookmark size={26} weight="duotone" className="text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-[14rem]">
        Pasa el cursor sobre un recurso para previsualizarlo
      </p>
    </div>
  )
}

export function ResourcePreviewPanel({ resource, phaseKey, phaseColor, className }) {
  if (!resource) return (
    <aside className={className}>
      <Placeholder />
    </aside>
  )

  const key = `${phaseKey}:${resource.id}`
  const preview = RESOURCE_PREVIEWS[key]
  const Icon = RESOURCE_ICONS[key] ?? BookBookmark

  return (
    <aside className={className}>
      {/* Resource identity */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="p-2.5 rounded-xl shrink-0"
            style={{ backgroundColor: `color-mix(in oklch, ${phaseColor} 12%, transparent)` }}
          >
            <Icon size={26} weight="duotone" style={{ color: phaseColor }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground leading-tight">{resource.tipo}</p>
            <span className={`text-xs font-medium ${INTERACTIVIDAD_COLOR[resource.interactividad] ?? INTERACTIVIDAD_COLOR.Baja}`}>
              Interactividad {resource.interactividad}
            </span>
          </div>
        </div>
      </div>

      {/* Preview content */}
      {preview ? (
        <div className="p-5 flex flex-col gap-4 flex-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: phaseColor }}>
              Qué genera
            </p>
            <ul className="space-y-2">
              {preview.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span
                    className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: phaseColor }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold">Formato: </span>
              {preview.format}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Sin previsualización disponible</p>
        </div>
      )}
    </aside>
  )
}
