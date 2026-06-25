import { StateBadge } from '@/core/components/ui/StateBadge'
import { isLockedOut } from '@/features/admin/components/users/statusHelpers.js'

export function UserStatusBadge({ user }) {
  if (!user.is_active) {
    return <StateBadge status="neutral">Inactivo</StateBadge>
  }
  if (isLockedOut(user)) {
    return (
      <StateBadge
        status="error"
        title={`Bloqueado hasta ${new Date(user.locked_until).toLocaleString()}`}
      >
        🔒 Bloqueado
      </StateBadge>
    )
  }
  return <StateBadge status="success">Activo</StateBadge>
}
