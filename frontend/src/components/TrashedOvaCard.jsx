import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from './StatusBadge'

export function TrashedOvaCard({ ova, isSelected, onToggleSelect, onRestore, onPermanentDelete, isRestoring, isDeleting }) {
  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(ova.id)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{ova.title}</h3>
            <StatusBadge status={ova.status} />
          </div>
          {ova.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ova.description}</p>
          ) : null}
          {ova.owner ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Por: <span className="font-medium text-foreground">{ova.owner.full_name}</span>
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            Eliminado el {formatDate(ova.deleted_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRestore(ova.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 text-primary border-primary/30 hover:bg-primary/5"
        >
          {isRestoring ? 'Restaurando...' : '↩ Restaurar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPermanentDelete(ova)}
          disabled={isRestoring || isDeleting}
          className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          {isDeleting ? 'Eliminando...' : '🗑 Borrar definitivamente'}
        </Button>
      </div>
    </div>
  )
}
