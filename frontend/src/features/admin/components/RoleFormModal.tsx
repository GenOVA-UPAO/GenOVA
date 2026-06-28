import type { ChangeEvent, FormEvent } from 'react'
import { Alert, AlertDescription } from '@/core/components/ui/alert'
import { Button } from '@/core/components/ui/button'
import { Checkbox } from '@/core/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { Textarea } from '@/core/components/ui/textarea'
import { AVAILABLE_PERMISSIONS } from '@/features/admin/lib/permissions'
import type { Role } from '../lib/types'

interface Props {
  editingRole: Role | null
  roleName: string
  roleDescription: string
  selectedPermissions: string[]
  formError: string
  isSubmitting: boolean
  onRoleNameChange: (e: ChangeEvent<HTMLInputElement>) => void
  onRoleDescriptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onPermissionToggle: (permId: string) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export function RoleFormModal({
  editingRole,
  roleName,
  roleDescription,
  selectedPermissions,
  formError,
  isSubmitting,
  onRoleNameChange,
  onRoleDescriptionChange,
  onPermissionToggle,
  onSubmit,
  onClose,
}: Props) {
  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRole
              ? `Editar rol: ${editingRole.name}`
              : 'Crear nuevo rol'}
          </DialogTitle>
          <DialogDescription>
            {editingRole
              ? 'Ajusta el nombre y la selección de permisos para este perfil del sistema.'
              : 'Elige un nombre único y asigna los permisos necesarios para este perfil.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nombre del rol
            </Label>
            <Input
              type="text"
              placeholder="Ej. docente, supervisor..."
              value={roleName}
              onChange={onRoleNameChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Descripción (Opcional)
            </Label>
            <Textarea
              placeholder="Breve descripción del propósito de este rol..."
              value={roleDescription}
              onChange={onRoleDescriptionChange}
              disabled={isSubmitting}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Permisos del rol
            </Label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  htmlFor={`perm-${perm.id}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <Checkbox
                    id={`perm-${perm.id}`}
                    checked={selectedPermissions.includes(perm.id)}
                    onCheckedChange={() => onPermissionToggle(perm.id)}
                    disabled={isSubmitting}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{perm.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {perm.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !roleName.trim()}>
              {isSubmitting
                ? editingRole
                  ? 'Guardando...'
                  : 'Creando...'
                : editingRole
                  ? 'Guardar cambios'
                  : 'Crear rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
