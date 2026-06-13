import { useState } from 'react'
import { UserStatusBadge } from './StatusBadge.jsx'
import { UserActionMenu } from './UserActionMenu.jsx'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// `hide` oculta columnas secundarias en pantallas chicas para que la tabla no
// desborde en móvil (correo/estado/rol/acciones siempre visibles).
const COLS = [
  { label: 'Nombre Completo', cls: 'w-[18%] min-w-[140px]' },
  { label: 'Correo Electrónico', cls: 'w-[18%] min-w-[160px]' },
  { label: 'Código UPAO', cls: 'w-[12%] min-w-[100px]', hide: 'hidden lg:table-cell' },
  { label: 'Teléfono', cls: 'w-[10%] min-w-[110px]', hide: 'hidden md:table-cell' },
  { label: 'Estado', cls: 'w-[10%] min-w-[90px]' },
  { label: 'Rol Asignado', cls: 'w-[20%] min-w-[150px]' },
  { label: 'Acciones', cls: 'w-[12%] min-w-[100px] text-center' },
]

function formatUnivId(value) {
  if (!value) return <span className="text-muted-foreground italic">--</span>
  return String(value).padStart(9, '0')
}

function RoleCell({ user, roles, isCurrentUserAdmin, isMe, isActionsDisabled, isUpdating, onChange, getRoleColorClasses }) {
  if (isMe) {
    return (
      <span className={`inline-flex items-center h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold capitalize ${getRoleColorClasses(user.role?.name || 'administrador')}`}>
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
            <option key={r.id} value={r.id} className="bg-popover text-foreground font-medium">
              {r.name}
            </option>
          )
        })}
      </select>
      {isUpdating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" /> : null}
    </div>
  )
}

export function UsersTable({ users, roles, currentUser, updatingUserId, handlers, getRoleColorClasses }) {
  const [openMenuFor, setOpenMenuFor] = useState(null)
  const isCurrentUserAdmin = currentUser?.role === 'administrador'

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {COLS.map((c) => (
              <TableHead key={c.label} className={`whitespace-nowrap text-xs uppercase tracking-wider ${c.cls} ${c.hide || ''}`}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isMe = currentUser?.id === user.id
            const isUpdating = updatingUserId === user.id
            const targetIsAdmin = user.role?.name === 'administrador'
            const isActionsDisabled = targetIsAdmin && !isCurrentUserAdmin
            return (
              <TableRow key={user.id}>
                <TableCell className="font-semibold">
                  {user.full_name || <span className="text-muted-foreground italic font-normal">No especificado</span>}
                </TableCell>
                <TableCell className="break-words">{user.email}</TableCell>
                <TableCell className="font-mono text-xs hidden lg:table-cell">{formatUnivId(user.university_id)}</TableCell>
                <TableCell className="whitespace-nowrap hidden md:table-cell">
                  {user.phone_number || <span className="text-muted-foreground italic">--</span>}
                </TableCell>
                <TableCell><UserStatusBadge user={user} /></TableCell>
                <TableCell>
                  <RoleCell
                    user={user} roles={roles}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    isMe={isMe} isActionsDisabled={isActionsDisabled} isUpdating={isUpdating}
                    onChange={handlers.handleRoleChange}
                    getRoleColorClasses={getRoleColorClasses}
                  />
                </TableCell>
                <TableCell className="text-center relative">
                  {isMe || isActionsDisabled ? (
                    <span className="text-muted-foreground text-xs italic">Protegido</span>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenMenuFor((id) => (id === user.id ? null : user.id))}
                      >
                        Acción ▾
                      </Button>
                      {openMenuFor === user.id ? (
                        <UserActionMenu
                          user={user}
                          onClose={() => setOpenMenuFor(null)}
                          onEdit={() => handlers.openEdit(user)}
                          onToggleStatus={handlers.handleToggleStatus}
                          onUnlock={handlers.handleUnlockUser}
                          onSendResetEmail={handlers.handleSendResetEmail}
                          onSendResetWhatsApp={handlers.runWhatsAppReset}
                        />
                      ) : null}
                    </>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
