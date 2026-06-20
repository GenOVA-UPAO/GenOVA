import { isLockedOut } from '@/features/admin/components/users/statusHelpers.js'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/core/components/ui/dropdown-menu'

// Ítems del menú de acciones de usuario. Se renderizan dentro de un
// <DropdownMenuContent> (radix) en UsersTable: portal + cierre con escape/
// click-fuera + foco accesible, y sin clipping dentro del overflow de la tabla.
export function UserActionMenu({
  user,
  onEdit,
  onToggleStatus,
  onUnlock,
  onSendResetEmail,
  onSendResetWhatsApp,
}) {
  return (
    <>
      <DropdownMenuItem onSelect={onEdit}>
        <span>✏️</span> Editar Perfil
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => onToggleStatus(user.id, !user.is_active)}
        className={user.is_active ? 'text-accent-brand' : 'text-primary'}
      >
        <span>{user.is_active ? '🚫' : '✅'}</span>
        {user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
      </DropdownMenuItem>
      {isLockedOut(user) && (
        <DropdownMenuItem onSelect={() => onUnlock(user.id)} className="text-primary">
          <span>🔓</span> Desbloquear Cuenta
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onSendResetEmail(user.id)}>
        <span>✉️</span> Restablecer por Correo
      </DropdownMenuItem>
      {user.phone_number ? (
        <DropdownMenuItem onSelect={() => onSendResetWhatsApp(user.id)} className="text-primary">
          <span>💬</span> Enlace WhatsApp
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem disabled>
          <span>💬</span> Sin Teléfono
        </DropdownMenuItem>
      )}
    </>
  )
}
