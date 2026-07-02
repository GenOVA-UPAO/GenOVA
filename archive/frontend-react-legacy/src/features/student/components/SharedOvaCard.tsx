import { Badge } from '@/core/components/ui/badge'
import type { SharedOva } from '../lib/types'

/**
 * Tarjeta para mostrar un OVA compartido con el estudiante (vista de solo lectura).
 */
export function SharedOvaCard({ ova }: { ova?: SharedOva }) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">
          {ova?.title || 'OVA sin título'}
        </h3>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Compartido
        </Badge>
      </div>

      {ova?.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {ova.description}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Por: {ova?.owner_name || 'Profesor'}</span>
        {ova?.created_at && (
          <span>· {new Date(ova.created_at).toLocaleDateString('es-PE')}</span>
        )}
      </div>
    </div>
  )
}
