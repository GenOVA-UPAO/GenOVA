import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/core/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { Textarea } from '@/core/components/ui/textarea'
import {
  type MetadataInput,
  metadataSchema,
} from '@/features/ova_library/lib/metadataSchema'

interface EditMetadataModalProps {
  initial: { title: string; description?: string }
  onSave: (values: MetadataInput) => Promise<boolean>
  onCancel: () => void
  isLoading: boolean
}

export function EditMetadataModal({
  initial,
  onSave,
  onCancel,
  isLoading,
}: EditMetadataModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MetadataInput>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      title: initial?.title || '',
      description: initial?.description || '',
    },
  })
  const title = useWatch({ control, name: 'title' }) || ''

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar metadatos</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Actualiza el título y descripción del OVA.
        </p>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="metadata-title">Título *</Label>
            <Input
              id="metadata-title"
              type="text"
              maxLength={250}
              placeholder="Ej. Regresión lineal aplicada"
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            <p className="text-[11px] text-muted-foreground">
              {title.length}/100
            </p>
            {errors.title ? (
              <p className="text-xs font-medium text-destructive">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metadata-description">Descripción</Label>
            <Textarea
              id="metadata-description"
              rows={4}
              className="resize-none"
              placeholder="Opcional"
              {...register('description')}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
