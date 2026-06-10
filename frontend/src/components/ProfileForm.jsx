import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ProfileForm({
  fullName, email, universityId, gender, phoneNumber, role, createdAt,
  validationError, saving,
  onFullNameChange, onEmailChange, onUniversityIdChange, onGenderChange,
  onPhoneNumberChange, onReset, onSubmit, getInitials, formatDate
}) {
  return (
    <div className="rounded-xl border border-border bg-background shadow-md overflow-hidden">
      <form onSubmit={onSubmit} className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-violet-600 text-2xl font-bold text-white shadow-lg">
            {getInitials()}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-lg font-bold capitalize">{fullName || 'Usuario'}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                Rol: {role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Miembro desde el {formatDate(createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Nombre Completo
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={onFullNameChange}
              aria-invalid={!!validationError.fullName}
              disabled={saving}
              placeholder="Ej: Juan Pérez"
            />
            {validationError.fullName ? (
              <p className="text-xs text-destructive font-medium">{validationError.fullName}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={onEmailChange}
              aria-invalid={!!validationError.email}
              disabled={saving}
              placeholder="usuario@correo.com"
            />
            {validationError.email ? (
              <p className="text-xs text-destructive font-medium">{validationError.email}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="universityId" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Código Universitario (UPAO)
            </Label>
            <Input
              id="universityId"
              type="number"
              value={universityId}
              onChange={onUniversityIdChange}
              aria-invalid={!!validationError.universityId}
              disabled={saving}
              placeholder="Ej: 257022"
              min="1"
            />
            <p className="text-[10px] text-muted-foreground">Se autocompletará con ceros a la izquierda a 9 dígitos al guardarse.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Sexo / Género
              </Label>
              <Select value={gender} onValueChange={(val) => onGenderChange({ target: { value: val } })} disabled={saving}>
                <SelectTrigger id="gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro / No especificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Teléfono de contacto
              </Label>
              <Input
                id="phoneNumber"
                type="text"
                value={phoneNumber}
                onChange={onPhoneNumberChange}
                aria-invalid={!!validationError.phoneNumber}
                disabled={saving}
                placeholder="Ej: +51987285992"
              />
              {validationError.phoneNumber ? (
                <p className="text-xs text-destructive font-medium">{validationError.phoneNumber}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
            Restablecer
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
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
