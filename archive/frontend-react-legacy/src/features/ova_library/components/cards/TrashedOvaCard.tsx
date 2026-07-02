import { Button } from '@/core/components/ui/button'
import { formatDate } from '@/features/ova_library/lib/formatDate'
import type { OvaListItem } from '@/features/ova_library/lib/types'
import { OvaCardShell } from './OvaCardShell'

interface TrashedOvaCardProps {
  ova: OvaListItem
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onRestore: (id: string) => void
  onPermanentDelete: (ova: OvaListItem) => void
  isRestoring: boolean
  isDeleting: boolean
}

export function TrashedOvaCard({
  ova,
  isSelected,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: TrashedOvaCardProps) {
  const footer = (
    <div className="flex items-center gap-2">
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
  )

  return (
    <OvaCardShell
      ova={ova}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      rootClassName={`rounded-xl border bg-white p-5 shadow-sm transition ${
        isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
      }`}
      dateLabel="Eliminado el"
      dateValue={formatDate(ova.deleted_at as string | undefined)}
      dateClassName="text-red-400 font-medium"
      footer={footer}
    />
  )
}
