import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PasswordChangeForm({
  currentPassword,
  newPassword,
  confirmPassword,
  validationError,
  savingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Seguridad de la Cuenta
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            Actualiza tu contraseña periódicamente para mantener tu cuenta protegida.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Contraseña Actual
            </Label>
            <Input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={onCurrentPasswordChange}
              aria-invalid={!!validationError.currentPassword}
              disabled={savingPassword}
              placeholder="••••••••"
            />
            {validationError.currentPassword ? (
              <p className="text-xs text-destructive font-medium">{validationError.currentPassword}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Nueva Contraseña
            </Label>
            <Input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={onNewPasswordChange}
              aria-invalid={!!validationError.newPassword}
              disabled={savingPassword}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres alfanuméricos (letras y números)</p>
            {validationError.newPassword ? (
              <p className="text-xs text-destructive font-medium">{validationError.newPassword}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Confirmar Nueva Contraseña
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={onConfirmPasswordChange}
              aria-invalid={!!validationError.confirmPassword}
              disabled={savingPassword}
              placeholder="••••••••"
            />
            {validationError.confirmPassword ? (
              <p className="text-xs text-destructive font-medium">{validationError.confirmPassword}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={savingPassword}
            className="gap-2"
          >
            {savingPassword ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Actualizando...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
