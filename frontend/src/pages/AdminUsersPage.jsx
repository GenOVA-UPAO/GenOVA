import { useUsersAdmin } from '../hooks/useUsersAdmin.js'

export function AdminUsersPage() {
  const {
    users,
    roles,
    loading,
    error,
    updatingUserId,
    updateError,
    currentUser,
    currentPage,
    totalPages,
    totalItems,
    fetchUsers,
    handleRoleChange,
    handlePageChange,
    formatDate,
    getRoleColorClasses,
    setUpdateError,
  } = useUsersAdmin()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
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
      </div>

      {updateError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex gap-2">
            <span>⚠️</span>
            <span>{updateError}</span>
          </div>
          <button onClick={() => setUpdateError('')} className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer">
            Ignorar
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
              <p className="text-xs text-slate-400">Cargando usuarios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={() => fetchUsers(currentPage)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-4 w-[25%] min-w-[160px] whitespace-nowrap">Nombre Completo</th>
                  <th scope="col" className="px-6 py-4 w-[25%] min-w-[180px] whitespace-nowrap">Correo Electrónico</th>
                  <th scope="col" className="px-6 py-4 w-[20%] min-w-[120px] whitespace-nowrap">Miembro desde</th>
                  <th scope="col" className="px-6 py-4 w-[30%] min-w-[220px] whitespace-nowrap">Rol Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => {
                  const isMe = currentUser && currentUser.id === user.id
                  const isUpdating = updatingUserId === user.id

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                        {user.full_name || <span className="text-slate-400 italic font-normal">No especificado</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {isMe ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-1.5">
                            <span className={`inline-flex items-center h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold select-none capitalize ${getRoleColorClasses(user.role?.name || 'administrador')}`}>
                              {user.role?.name || 'Administrador'}
                            </span>
                            <span className="text-[12px] text-slate-400 font-medium italic whitespace-nowrap">
                              Tú (Sesión activa)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <select
                                value={user.role?.id || (roles.length > 0 ? roles[0].id : '')}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className={`h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold focus:outline-none transition-colors cursor-pointer capitalize disabled:opacity-50 disabled:cursor-not-allowed ${getRoleColorClasses(user.role?.name)}`}
                                disabled={isUpdating}
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id} className="capitalize bg-white text-slate-700 font-medium">
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"></div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-800 font-bold">{currentPage}</span> de <span className="text-slate-800 font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &lt;&lt; Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente &gt;&gt;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
