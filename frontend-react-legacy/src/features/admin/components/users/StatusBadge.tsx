import { StateBadge } from '@/core/components/ui/StateBadge'
import type { AdminUser } from '../../lib/types'
import { isLockedOut } from './statusHelpers'

interface Props {
  user: AdminUser
}

export function UserStatusBadge({ user }: Props) {
  if (!user.is_active) {
    return <StateBadge status="neutral">Inactivo</StateBadge>
  }
  if (isLockedOut(user)) {
    return (
      <StateBadge
        status="error"
        title={`Bloqueado hasta ${user.locked_until ? new Date(user.locked_until).toLocaleString('es-PE') : ''}`}
      >
        🔒 Bloqueado
      </StateBadge>
    )
  }
  return <StateBadge status="success">Activo</StateBadge>
}
