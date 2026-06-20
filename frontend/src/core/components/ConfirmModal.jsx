import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/components/ui/dialog'
import { Button } from '@/core/components/ui/button'

export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, isLoading, danger = true }) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground whitespace-pre-line">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            className="flex-1"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
