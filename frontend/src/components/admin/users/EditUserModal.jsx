import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { userEditSchema } from '@/lib/schemas/user.js'

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function EditUserModal({ user, onClose, onSave }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      full_name: user.full_name || '',
      email: user.email || '',
      university_id: user.university_id ? String(user.university_id) : '',
      gender: user.gender || 'otro',
      phone_number: user.phone_number || '',
    },
  })

  const onSubmit = async (form) => {
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      university_id: form.university_id ? parseInt(form.university_id, 10) : null,
      gender: form.gender || null,
      phone_number: form.phone_number?.trim() || null,
    }
    const ok = await onSave(user.id, payload)
    if (ok) onClose()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil: {user.full_name || user.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nombre Completo" htmlFor="edit-full-name" error={errors.full_name?.message}>
            <Input id="edit-full-name" type="text" placeholder="Ej: Juan Pérez" {...register('full_name')} />
          </Field>
          <Field label="Correo Electrónico" htmlFor="edit-email" error={errors.email?.message}>
            <Input id="edit-email" type="email" placeholder="ejemplo@correo.com" {...register('email')} />
          </Field>
          <Field label="Código Universitario (UPAO)" htmlFor="edit-uni-id">
            <Input id="edit-uni-id" type="number" min="1" placeholder="Ej: 257022" {...register('university_id')} />
            <p className="text-[10px] text-muted-foreground mt-0.5">Se autocompletará con ceros a la izquierda a 9 dígitos.</p>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sexo / Género" htmlFor="edit-gender">
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Teléfono" htmlFor="edit-phone" error={errors.phone_number?.message}>
              <Input id="edit-phone" type="text" placeholder="Ej: +51987285992" {...register('phone_number')} />
            </Field>
          </div>
          <DialogFooter className="pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
