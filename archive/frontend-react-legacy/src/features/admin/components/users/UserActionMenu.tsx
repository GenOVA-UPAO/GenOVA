import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/core/components/ui/dropdown-menu'
import type { AdminUser } from '../../lib/types'
import { isLockedOut } from './statusHelpers'

interface Props {
  user: AdminUser
  onEdit: () => void
  onToggleStatus: (userId: string, isActive: boolean) => void
  onUnlock: (userId: string) => void
  onSendResetEmail: (userId: string) => void
  onSendResetWhatsApp: (userId: string) => void
}

export function UserActionMenu({
  user,
  onEdit,
  onToggleStatus,
  onUnlock,
  onSendResetEmail,
  onSendResetWhatsApp,
}: Props) {
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
        <DropdownMenuItem
          onSelect={() => onUnlock(user.id)}
          className="text-primary"
        >
          <span>🔓</span> Desbloquear Cuenta
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onSendResetEmail(user.id)}>
        <span>✉️</span> Restablecer por Correo
      </DropdownMenuItem>
      {user.phone_number ? (
        <DropdownMenuItem
          onSelect={() => onSendResetWhatsApp(user.id)}
          className="text-primary"
        >
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
