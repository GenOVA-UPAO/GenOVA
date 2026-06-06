import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function EditMetadataModal({ form, onChange, onSubmit, onCancel, isLoading, error }) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar metadatos</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Actualiza el título y descripción del OVA.</p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="metadata-title">Título *</Label>
            <Input
              id="metadata-title"
              name="title"
              type="text"
              value={form.title}
              onChange={onChange}
              maxLength={250}
              placeholder="Ej. Regresión lineal aplicada"
            />
            <p className="text-[11px] text-muted-foreground">{form.title.length}/100</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metadata-description">Descripción</Label>
            <Textarea
              id="metadata-description"
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="resize-none"
              placeholder="Opcional"
            />
          </div>

          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        </div>

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={onSubmit} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
