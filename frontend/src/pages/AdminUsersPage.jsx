import { useState } from 'react'
import { useUsersAdmin } from '../hooks/admin/useUsersAdmin.js'
import { EditUserModal } from '../components/admin/users/EditUserModal.jsx'
import { UsersTable } from '../components/admin/users/UsersTable.jsx'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="space-y-6 relative">
      <header className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra las cuentas registradas en el sistema y define sus roles y permisos.
          </p>
        </div>
        <div className="bg-muted rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-semibold self-start md:self-auto border border-border shadow-sm">
          Total: <span className="text-accent-brand font-bold text-sm">{totalItems}</span> usuarios
        </div>
      </header>

      {updateError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between shadow-sm">
          <span>⚠️ {updateError}</span>
          <Button variant="ghost" size="xs" onClick={() => setUpdateError('')} className="text-destructive">
            Ignorar
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => fetchUsers(currentPage)}>
                Reintentar
              </Button>
            </div>
          </div>
        ) : (
          <UsersTable
            users={users} roles={roles} currentUser={currentUser}
            updatingUserId={updatingUserId} handlers={handlers}
            getRoleColorClasses={getRoleColorClasses}
          />
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4 px-1">
          <p className="text-xs text-muted-foreground font-medium">
            Página <span className="text-foreground font-bold">{currentPage}</span> de{' '}
            <span className="text-foreground font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex-1 sm:flex-none"
            >
              ← Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex-1 sm:flex-none"
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
    </div>
  )
}
