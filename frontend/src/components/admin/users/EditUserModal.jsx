import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

export function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    university_id: user.university_id || '',
    gender: user.gender || 'otro',
    phone_number: user.phone_number || '',
  })

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (form.full_name.trim().length < 3) {
      alert('El nombre debe tener al menos 3 caracteres.')
      return
    }
    if (!form.email.includes('@') || !form.email.includes('.')) {
      alert('Ingresa un correo electrónico válido.')
      return
    }
    if (form.phone_number) {
      const cleaned = form.phone_number.replace(/[\s+-]/g, '')
      if (!/^\d+$/.test(cleaned)) {
        alert('El teléfono solo debe contener dígitos y el signo +.')
        return
      }
    }
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      university_id: form.university_id ? parseInt(form.university_id, 10) : null,
      gender: form.gender || null,
      phone_number: form.phone_number.trim() || null,
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
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre Completo" htmlFor="edit-full-name">
            <Input
              id="edit-full-name"
              type="text"
              required
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </Field>
          <Field label="Correo Electrónico" htmlFor="edit-email">
            <Input
              id="edit-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="ejemplo@correo.com"
            />
          </Field>
          <Field label="Código Universitario (UPAO)" htmlFor="edit-uni-id">
            <Input
              id="edit-uni-id"
              type="number"
              min="1"
              value={form.university_id}
              onChange={(e) => update('university_id', e.target.value)}
              placeholder="Ej: 257022"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Se autocompletará con ceros a la izquierda a 9 dígitos.</p>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sexo / Género" htmlFor="edit-gender">
              <Select value={form.gender} onValueChange={(val) => update('gender', val)}>
                <SelectTrigger id="edit-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Teléfono" htmlFor="edit-phone">
              <Input
                id="edit-phone"
                type="text"
                value={form.phone_number}
                onChange={(e) => update('phone_number', e.target.value)}
                placeholder="Ej: +51987285992"
              />
            </Field>
          </div>
          <DialogFooter className="pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
