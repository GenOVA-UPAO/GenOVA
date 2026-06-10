import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function DeleteRoleModal({
  deletingRole, roles, reassignRoleId, deleteError, isDeleting,
  onReassignRoleChange, onConfirm, onCancel,
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !isDeleting) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            ¿Eliminar rol: <span className="capitalize">{deletingRole.name}</span>?
          </DialogTitle>
        </DialogHeader>

        {deletingRole.user_count > 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex gap-2.5">
                <span className="text-lg font-bold">⚠️</span>
                <div>
                  <p className="font-semibold">Reasignación requerida</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Este rol tiene <span className="font-bold">{deletingRole.user_count}</span> usuario(s) asignado(s). Para eliminarlo, migra sus usuarios a otro rol activo.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reasignar usuarios a:
              </Label>
              <Select
                value={reassignRoleId || ''}
                onValueChange={(val) => onReassignRoleChange({ target: { value: val } })}
                disabled={isDeleting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Selecciona un rol de destino --" />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.id !== deletingRole.id)
                    .map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name} ({r.user_count ?? 0} usuarios)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta acción es permanente e irreversible. Se borrarán todas las configuraciones del rol y no hay usuarios asignados que se verán afectados.
          </p>
        )}

        {deleteError ? (
          <Alert variant="destructive">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting || (deletingRole.user_count > 0 && !reassignRoleId)}
          >
            {isDeleting
              ? 'Eliminando...'
              : deletingRole.user_count > 0
                ? 'Reasignar y eliminar'
                : 'Eliminar rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
