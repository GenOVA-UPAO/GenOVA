import { useState } from 'react'
import { m as motion } from 'motion/react'
import { Users, MagnifyingGlass } from '@phosphor-icons/react'
import { useUsersAdmin } from '@/features/admin/hooks/useUsersAdmin.js'
import { EditUserModal } from '@/features/admin/components/users/EditUserModal.jsx'
import { UsersTable } from '@/features/admin/components/users/UsersTable.jsx'
import { Button } from '@/core/components/ui/button'

function buildWhatsAppHref(payload) {
  if (!payload?.whatsapp_url) return null
  return payload.whatsapp_url
}

export function AdminUsersPage() {
  const {
    users, roles, loading, error, updatingUserId, updateError,
    currentUser, currentPage, totalPages, totalItems,
    fetchUsers, handleRoleChange, handleEditUser, handleToggleStatus,
    handleUnlockUser, handleSendResetEmail, handleGenerateResetWhatsApp,
    handlePageChange, getRoleColorClasses, setUpdateError,
  } = useUsersAdmin()

  const [editingUser, setEditingUser] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  async function runWhatsAppReset(userId) {
    const payload = await handleGenerateResetWhatsApp(userId)
    const href = buildWhatsAppHref(payload)
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }

  const handlers = {
    handleRoleChange, handleToggleStatus, handleUnlockUser,
    handleSendResetEmail, runWhatsAppReset,
    openEdit: (user) => setEditingUser(user),
  }

  const visibleUsers = users.filter((u) => 
    (roleFilter === 'all' || u.role?.name?.toLowerCase() === roleFilter) &&
    ((u.full_name || '').toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mx-auto max-w-6xl pb-10"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl flex items-center gap-3">
            <Users className="text-primary" weight="duotone" />
            Usuarios
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {totalItems} usuarios registrados en la plataforma
          </p>
        </div>
        <Button className="shadow-md font-bold">
          <span className="mr-2 text-lg leading-none">+</span> Invitar usuario
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} weight="bold" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar por nombre o email..." 
            className="w-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all" 
          />
        </div>
        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)} 
          className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md px-4 py-2.5 text-sm font-medium outline-none cursor-pointer shadow-sm hover:bg-accent/50 transition-colors"
        >
          <option value="all">Todos los roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.name.toLowerCase()} className="capitalize">{r.name}</option>
          ))}
        </select>
      </div>

      {updateError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm font-bold text-destructive flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">⚠️ {updateError}</span>
          <Button variant="ghost" size="sm" onClick={() => setUpdateError('')} className="text-destructive hover:bg-destructive/10">
            Ignorar
          </Button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card glass-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm" />
              <p className="text-sm font-bold text-muted-foreground">Cargando usuarios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-[400px] items-center justify-center p-6 text-center bg-destructive/5">
            <div className="max-w-md space-y-4">
              <p className="text-sm text-destructive font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchUsers(currentPage)} className="shadow-sm">
                Reintentar
              </Button>
            </div>
          </div>
        ) : (
          <UsersTable
            users={visibleUsers} roles={roles} currentUser={currentUser}
            updatingUserId={updatingUserId} handlers={handlers}
            getRoleColorClasses={getRoleColorClasses}
            searchQuery={search}
          />
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
          <p className="text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
            Página <span className="text-foreground font-bold">{currentPage}</span> de <span className="text-foreground font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex-1 sm:flex-none rounded-xl border-border/50 shadow-sm hover:bg-accent/50"
            >
              ← Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex-1 sm:flex-none rounded-xl border-border/50 shadow-sm hover:bg-accent/50"
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
        />
      )}
    </motion.div>
  )
}
