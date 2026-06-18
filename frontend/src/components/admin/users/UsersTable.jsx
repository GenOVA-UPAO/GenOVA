import { UserStatusBadge } from './StatusBadge.jsx'
import { UserActionMenu } from './UserActionMenu.jsx'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

function formatUnivId(value) {
  if (!value) return <span className="text-muted-foreground italic text-[11px]">--</span>
  return <span className="font-mono text-xs font-medium bg-muted/40 px-1.5 py-0.5 rounded border border-border/50">{String(value).padStart(9, '0')}</span>
}

function RoleBadge({ role }) {
  const roleName = (role?.name || 'administrador').toLowerCase()
  let color = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (roleName === 'administrador') color = 'bg-primary/10 text-primary border-primary/20'
  if (roleName === 'usuario') color = 'bg-accent-brand/10 text-accent-brand border-accent-brand/20'
  
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider capitalize shadow-sm ${color}`}>
      {roleName}
    </span>
  )
}

function RoleCell({ user, roles, isCurrentUserAdmin, isMe, isActionsDisabled, isUpdating, onChange, getRoleColorClasses }) {
  if (isMe) {
    return <RoleBadge role={user.role} />
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={user.role?.id || (roles.length > 0 ? roles[0].id : '')}
        onChange={(e) => onChange(user.id, e.target.value)}
        disabled={isUpdating || isActionsDisabled}
        className={`h-8 w-[130px] rounded-xl border border-border/50 bg-background/50 backdrop-blur-md px-3 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer capitalize shadow-sm disabled:opacity-50 hover:bg-accent/50 transition-colors ${getRoleColorClasses(user.role?.name)}`}
      >
        {roles.map((r) => {
          if (r.name === 'administrador' && !isCurrentUserAdmin) return null
          return (
            <option key={r.id} value={r.id} className="bg-popover text-foreground font-medium normal-case">
              {r.name}
            </option>
          )
        })}
      </select>
      {isUpdating && <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary" />}
    </div>
  )
}

export function UsersTable({ users, roles, currentUser, updatingUserId, handlers, getRoleColorClasses, searchQuery }) {
  const isCurrentUserAdmin = currentUser?.role === 'administrador'

  return (
    <div className="flex flex-col w-full">
      <div className="grid grid-cols-[3rem_minmax(150px,1fr)_auto_minmax(140px,auto)_80px_100px] items-center gap-4 px-6 py-4 border-b border-border/50 bg-muted/20">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"></p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Usuario</p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center hidden md:block">Código / Tel</p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rol</p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Estado</p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Acciones</p>
      </div>

      <div className="flex flex-col min-h-[300px]">
        {users.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-sm font-medium text-muted-foreground">
            {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay usuarios para mostrar'}
          </div>
        ) : (
          users.map((user, i) => {
            const isMe = currentUser?.id === user.id
            const isUpdating = updatingUserId === user.id
            const targetIsAdmin = user.role?.name === 'administrador'
            const isActionsDisabled = targetIsAdmin && !isCurrentUserAdmin

            // Initial generic styling for avatars based on wireframe
            const isActive = user.is_active
            const avatarColor = isActive ? 'bg-gradient-to-br from-primary/20 to-accent-brand/20 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'

            return (
              <div key={user.id} className={`grid grid-cols-[3rem_minmax(150px,1fr)_auto_minmax(140px,auto)_80px_100px] items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors ${i < users.length - 1 ? 'border-b border-border/50' : ''}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm border ${avatarColor}`}>
                  {(user.full_name || user.email || '?').slice(0, 2).toUpperCase()}
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">
                      {user.full_name || <span className="text-muted-foreground italic font-normal">No especificado</span>}
                    </p>
                    {!isActive && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground border border-border shadow-sm uppercase tracking-widest">INACTIVO</span>}
                    {isMe && <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-bold border border-primary/20 shadow-sm uppercase tracking-widest">TÚ</span>}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                    {user.email}
                  </p>
                </div>

                <div className="hidden md:flex flex-col items-center justify-center w-24">
                  {formatUnivId(user.university_id)}
                  {user.phone_number ? (
                    <span className="text-[10px] text-muted-foreground font-medium mt-1">{user.phone_number}</span>
                  ) : null}
                </div>

                <div>
                  <RoleCell
                    user={user} roles={roles}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    isMe={isMe} isActionsDisabled={isActionsDisabled} isUpdating={isUpdating}
                    onChange={handlers.handleRoleChange}
                    getRoleColorClasses={getRoleColorClasses}
                  />
                </div>

                <div className="flex justify-center">
                  <UserStatusBadge user={user} />
                </div>

                <div className="flex justify-center">
                  {isMe || isActionsDisabled ? (
                    <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border/50">Protegido</span>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-xl border-border/60 hover:bg-accent">
                          Acción ▾
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl">
                        <UserActionMenu
                          user={user}
                          onEdit={() => handlers.openEdit(user)}
                          onToggleStatus={handlers.handleToggleStatus}
                          onUnlock={handlers.handleUnlockUser}
                          onSendResetEmail={handlers.handleSendResetEmail}
                          onSendResetWhatsApp={handlers.runWhatsAppReset}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
