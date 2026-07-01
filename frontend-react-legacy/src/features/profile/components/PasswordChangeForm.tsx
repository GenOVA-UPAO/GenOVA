import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/core/components/ui/button'
import { Label } from '@/core/components/ui/label'
import { PasswordInput } from '@/core/components/ui/password-input'
import { useChangePassword } from '@/features/profile/hooks/useChangePassword'
import { changePasswordSchema } from '@/features/profile/schemas/user'

const LABEL = 'text-xs font-bold uppercase tracking-wide text-muted-foreground'

interface PasswordChangeFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function PasswordChangeForm() {
  const { changePassword } = useChangePassword()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: PasswordChangeFormValues) => {
    const ok = await changePassword(values)
    if (ok) reset()
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Seguridad de la Cuenta
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Actualiza tu contraseña periódicamente para mantener tu cuenta
            protegida.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className={LABEL}>
              Contraseña Actual
            </Label>
            <PasswordInput
              id="currentPassword"
              placeholder="••••••••"
              aria-invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
            {errors.currentPassword ? (
              <p className="text-xs text-destructive font-medium">
                {errors.currentPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className={LABEL}>
              Nueva Contraseña
            </Label>
            <PasswordInput
              id="newPassword"
              placeholder="••••••••"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres alfanuméricos (letras y números)
            </p>
            {errors.newPassword ? (
              <p className="text-xs text-destructive font-medium">
                {errors.newPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={LABEL}>
              Confirmar Nueva Contraseña
            </Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive font-medium">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
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
