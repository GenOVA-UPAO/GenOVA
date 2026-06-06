import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function BulkTrashModal({ count, onConfirm, onCancel, isLoading }) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover a la papelera</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            ¿Mover <span className="font-semibold text-foreground">{count} OVAs</span> a la papelera?
          </p>
          <p className="text-xs text-muted-foreground/70">Podrás restaurarlos desde la sección Papelera.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Moviendo...' : `Mover ${count}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
