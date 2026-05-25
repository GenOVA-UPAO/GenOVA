import { isLockedOut } from './statusHelpers.js'

export function UserStatusBadge({ user }) {
  if (!user.is_active) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
        Inactivo
      </span>
    )
  }
  if (isLockedOut(user)) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"
        title={`Bloqueado hasta ${new Date(user.locked_until).toLocaleString()}`}
      >
        🔒 Bloqueado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
      Activo
    </span>
  )
}
