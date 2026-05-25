import { useState } from 'react'
import { UserStatusBadge } from './StatusBadge.jsx'
import { UserActionMenu } from './UserActionMenu.jsx'

const COLS = [
  { label: 'Nombre Completo', cls: 'w-[18%] min-w-[140px]' },
  { label: 'Correo Electrónico', cls: 'w-[18%] min-w-[160px]' },
  { label: 'Código UPAO', cls: 'w-[12%] min-w-[100px]' },
  { label: 'Teléfono', cls: 'w-[10%] min-w-[110px]' },
  { label: 'Estado', cls: 'w-[10%] min-w-[90px]' },
  { label: 'Rol Asignado', cls: 'w-[20%] min-w-[150px]' },
  { label: 'Acciones', cls: 'w-[12%] min-w-[100px] text-center' },
]

function formatUnivId(value) {
  if (!value) return <span className="text-slate-400 italic">--</span>
  return String(value).padStart(9, '0')
}

function RoleCell({ user, roles, isCurrentUserAdmin, isMe, isActionsDisabled, isUpdating, onChange, getRoleColorClasses }) {
  if (isMe) {
    return (
      <span
        className={`inline-flex items-center h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold capitalize ${getRoleColorClasses(user.role?.name || 'administrador')}`}
      >
        {user.role?.name || 'Administrador'} 🧿
      </span>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={user.role?.id || (roles.length > 0 ? roles[0].id : '')}
        onChange={(e) => onChange(user.id, e.target.value)}
        disabled={isUpdating || isActionsDisabled}
        className={`h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold focus:outline-none cursor-pointer capitalize disabled:opacity-50 disabled:cursor-not-allowed ${getRoleColorClasses(user.role?.name)}`}
      >
        {roles.map((r) => {
          if (r.name === 'administrador' && !isCurrentUserAdmin) return null
          return (
            <option key={r.id} value={r.id} className="bg-white text-slate-700 font-medium">
              {r.name}
            </option>
          )
        })}
      </select>
      {isUpdating && <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />}
    </div>
  )
}

export function UsersTable({ users, roles, currentUser, updatingUserId, handlers, getRoleColorClasses }) {
  const [openMenuFor, setOpenMenuFor] = useState(null)
  const isCurrentUserAdmin = currentUser?.role === 'administrador'

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <table className="w-full border-collapse text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            {COLS.map((c) => (
              <th key={c.label} scope="col" className={`px-3 py-3 whitespace-nowrap ${c.cls}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {users.map((user) => {
            const isMe = currentUser?.id === user.id
            const isUpdating = updatingUserId === user.id
            const targetIsAdmin = user.role?.name === 'administrador'
            const isActionsDisabled = targetIsAdmin && !isCurrentUserAdmin
            return (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-3 py-3 font-semibold text-slate-900">
                  {user.full_name || <span className="text-slate-400 italic font-normal">No especificado</span>}
                </td>
                <td className="px-3 py-3 text-slate-700 break-all">{user.email}</td>
                <td className="px-3 py-3 text-slate-600 font-mono text-xs">{formatUnivId(user.university_id)}</td>
                <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                  {user.phone_number || <span className="text-slate-400 italic">--</span>}
                </td>
                <td className="px-3 py-3"><UserStatusBadge user={user} /></td>
                <td className="px-3 py-3">
                  <RoleCell
                    user={user} roles={roles}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    isMe={isMe} isActionsDisabled={isActionsDisabled} isUpdating={isUpdating}
                    onChange={handlers.handleRoleChange}
                    getRoleColorClasses={getRoleColorClasses}
                  />
                </td>
                <td className="px-3 py-3 text-center relative">
                  {isMe || isActionsDisabled ? (
                    <span className="text-slate-300 text-xs italic">Protegido</span>
                  ) : (
                    <>
                      <button
                        onClick={() => setOpenMenuFor((id) => (id === user.id ? null : user.id))}
                        className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Acción ▾
                      </button>
                      {openMenuFor === user.id && (
                        <UserActionMenu
                          user={user}
                          onClose={() => setOpenMenuFor(null)}
                          onEdit={() => handlers.openEdit(user)}
                          onToggleStatus={handlers.handleToggleStatus}
                          onUnlock={handlers.handleUnlockUser}
                          onSendResetEmail={handlers.handleSendResetEmail}
                          onSendResetWhatsApp={handlers.runWhatsAppReset}
                        />
                      )}
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
