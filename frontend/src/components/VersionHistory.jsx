import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function VersionHistory({ versions, open, onToggle }) {
  return (
    <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full justify-between px-5 py-3 h-auto font-semibold text-sm rounded-none"
      >
        <span>Historial de versiones ({versions.length})</span>
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </Button>
      {open ? (
        <div className="border-t border-border divide-y divide-border">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3">
              <Badge
                variant="outline"
                className={v.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-muted text-muted-foreground'}
              >
                v{v.version_number}{v.is_active ? ' (actual)' : ''}
              </Badge>
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {v.prompt ? `"${v.prompt.slice(0, 60)}${v.prompt.length > 60 ? '…' : ''}"` : '—'}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {v.created_at ? new Date(v.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
