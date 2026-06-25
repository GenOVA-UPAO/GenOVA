import { BookBookmark } from '@phosphor-icons/react'
import { RESOURCE_ICONS } from '@/features/ova_library/lib/resourceIcons.js'
import { RESOURCE_PREVIEWS } from '@/features/ova_library/lib/resourcePreviews.js'
import { RESOURCE_WIREFRAMES } from '@/features/ova_library/lib/resourceWireframes.js'

const INTERACTIVIDAD_COLOR = {
  Alta:  'text-primary',
  Media: 'text-accent-brand',
  Baja:  'text-muted-foreground',
}

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <BookBookmark size={26} weight="duotone" className="text-muted-foreground/40" />
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
  const Wireframe = RESOURCE_WIREFRAMES[key]

  return (
    <aside className={className}>
      {/* Resource identity */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl shrink-0"
            style={{ backgroundColor: `${phaseColor}18` }}
          >
            <Icon size={22} weight="duotone" style={{ color: phaseColor }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground leading-tight">{resource.tipo}</p>
            <span className={`text-xs font-medium ${INTERACTIVIDAD_COLOR[resource.interactividad] ?? INTERACTIVIDAD_COLOR.Baja}`}>
              Interactividad {resource.interactividad}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Wireframe preview */}
        {Wireframe && (
          <div className="p-4 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-foreground">
              Vista previa
            </p>
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <Wireframe />
            </div>
          </div>
        )}

        {/* Qué genera */}
        {preview && (
          <div className="p-4 flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: phaseColor }}>
                Qué genera
              </p>
              <ul className="space-y-1.5">
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
            <div className="pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                <span className="font-semibold">Formato: </span>
                {preview.format}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
