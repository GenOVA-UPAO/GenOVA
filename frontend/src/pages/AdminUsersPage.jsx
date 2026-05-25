import { useState } from 'react'
import { useUsersAdmin } from '../hooks/useUsersAdmin.js'
import { EditUserModal } from '../components/admin/users/EditUserModal.jsx'
import { UsersTable } from '../components/admin/users/UsersTable.jsx'

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra las cuentas registradas en el sistema y define sus roles y permisos.
          </p>
        </div>
        <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-semibold self-start md:self-auto border border-slate-200 shadow-sm">
          Total: <span className="text-indigo-600 font-bold text-sm">{totalItems}</span> usuarios
        </div>
      </header>

      {updateError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center justify-between shadow-sm">
          <span>⚠️ {updateError}</span>
          <button onClick={() => setUpdateError('')} className="text-rose-600 hover:text-rose-800 font-bold text-xs">
            Ignorar
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={() => fetchUsers(currentPage)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Reintentar
              </button>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-800 font-bold">{currentPage}</span> de{' '}
            <span className="text-slate-800 font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
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
