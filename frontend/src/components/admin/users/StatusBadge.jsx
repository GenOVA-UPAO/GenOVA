import { Badge } from '@/components/ui/badge'
import { isLockedOut } from './statusHelpers.js'

export function UserStatusBadge({ user }) {
  if (!user.is_active) {
    return (
      <Badge className="rounded-full bg-slate-100 text-slate-600 border-slate-200">
        Inactivo
      </Badge>
    )
  }
  if (isLockedOut(user)) {
    return (
      <Badge
        className="rounded-full bg-rose-100 text-rose-800 border-rose-200"
        title={`Bloqueado hasta ${new Date(user.locked_until).toLocaleString()}`}
      >
        🔒 Bloqueado
      </Badge>
    )
  }
  return (
    <Badge className="rounded-full bg-emerald-100 text-emerald-800 border-emerald-200">
      Activo
    </Badge>
  )
}
