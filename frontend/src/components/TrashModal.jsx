import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function TrashModal({ ova, onConfirm, onCancel, isLoading }) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover a la papelera</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            ¿Mover a la papelera{' '}
            <span className="font-semibold text-foreground">"{ova.title}"</span>?
          </p>
          <p className="text-xs text-muted-foreground/70">Podrás restaurarlo desde la sección Papelera.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Moviendo...' : 'Mover'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
