import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/select'
import { profileSchema } from '@/features/profile/schemas/user.js'

const LABEL = 'text-xs font-bold uppercase tracking-wide text-muted-foreground'

export function ProfileForm({ profile, role, createdAt, onSave, getInitials, formatDate, hideHeader = false }) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: profile })

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        {!hideHeader && (
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/50">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-brand font-display text-2xl font-bold text-primary-foreground shadow-lg">
              {getInitials()}
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-lg font-bold capitalize font-display">{profile.full_name || 'Usuario'}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize shadow-sm">
                  Rol: {role}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  Miembro desde el {formatDate(createdAt)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className={LABEL}>Nombre Completo</Label>
            <Input id="fullName" type="text" autoComplete="name" placeholder="Ej: Juan Pérez"
              aria-invalid={!!errors.full_name} {...register('full_name')} />
            {errors.full_name ? <p className="text-xs text-destructive font-medium">{errors.full_name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={LABEL}>Correo Electrónico</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="usuario@correo.com"
              aria-invalid={!!errors.email} {...register('email')} />
            {errors.email ? <p className="text-xs text-destructive font-medium">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="universityId" className={LABEL}>Código Universitario (UPAO)</Label>
            <Input id="universityId" type="number" inputMode="numeric" placeholder="Ej: 257022" min="1"
              {...register('university_id')} />
            <p className="text-[10px] text-muted-foreground">Se autocompletará con ceros a la izquierda a 9 dígitos al guardarse.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gender" className={LABEL}>Sexo / Género</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro / No especificado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber" className={LABEL}>Teléfono de contacto</Label>
              <Input id="phoneNumber" type="tel" autoComplete="tel" placeholder="Ej: +51987285992"
                aria-invalid={!!errors.phone_number} {...register('phone_number')} />
              {errors.phone_number ? <p className="text-xs text-destructive font-medium">{errors.phone_number.message}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => reset(profile)} disabled={isSubmitting}>
            Restablecer
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Guardando...
              </>
            ) : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
