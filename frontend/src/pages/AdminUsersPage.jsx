import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Current session admin info to prevent self-modification
  const [currentUser, setCurrentUser] = useState(null)

  // Track which user is currently being updated to show a saving spinner / disable control
  const [updatingUserId, setUpdatingUserId] = useState(null)
  const [updateError, setUpdateError] = useState('')

  const fetchCurrentUser = async () => {
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.status === 200) {
        const data = await response.json()
        setCurrentUser(data)
      }
    } catch (err) {
      console.error('Error fetching current user info:', err)
    }
  }

  const fetchRoles = async () => {
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/roles`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.status === 200) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (err) {
      console.error('Error fetching roles:', err)
    }
  }

  const fetchUsers = async (page) => {
    setLoading(true)
    setError('')
    const token = getToken()
    try {
      const response = await fetch(`${apiBaseUrl}/api/users?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.status === 200) {
        const data = await response.json()
        setUsers(data.users || [])
        setCurrentPage(data.page || 1)
        setTotalPages(data.total_pages || 1)
        setTotalItems(data.total_items || 0)
      } else {
        setError('No se pudo cargar la lista de usuarios.')
      }
    } catch (err) {
      setError('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchRoles()
    fetchUsers(1)
  }, [])

  const handleRoleChange = async (userId, roleId) => {
    if (!roleId) return // Ensure role selection exists
    setUpdatingUserId(userId)
    setUpdateError('')
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role_id: roleId })
      })

      if (response.status === 200) {
        const updatedUser = await response.json()
        // Update user role in local state
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u))
        )
      } else {
        const data = await response.json().catch(() => ({}))
        setUpdateError(data.detail || 'Ocurrió un error al actualizar el rol.')
      }
    } catch (err) {
      setUpdateError('Error al conectar con el servidor.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchUsers(newPage)
    }
  }

  // Format timestamp nicely
  const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra las cuentas registradas en el sistema y define sus roles y permisos.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-semibold md:text-right mt-2 md:mt-0">
          Total: <span className="text-indigo-400 font-bold text-sm">{totalItems}</span> usuarios
        </div>
      </div>

      {/* Global update error notification */}
      {updateError && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-400 flex items-center justify-between shadow-lg">
          <div className="flex gap-2">
            <span>⚠️</span>
            <span>{updateError}</span>
          </div>
          <button onClick={() => setUpdateError('')} className="text-rose-400 hover:text-rose-300 font-bold text-xs cursor-pointer">
            Ignorar
          </button>
        </div>
      )}

      {/* Users list card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
              <p className="text-xs text-slate-500">Cargando usuarios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-rose-400 font-medium">{error}</p>
              <button
                onClick={() => fetchUsers(currentPage)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-64 items-center justify-center p-6 text-center text-slate-500">
            No se encontraron usuarios en esta página.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4">Nombre Completo</th>
                  <th scope="col" className="px-6 py-4">Correo Electrónico</th>
                  <th scope="col" className="px-6 py-4">Fecha de Registro</th>
                  <th scope="col" className="px-6 py-4">Rol Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {users.map((user) => {
                  const isMe = currentUser && currentUser.id === user.id
                  const isUpdating = updatingUserId === user.id

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-white">
                        {user.full_name || <span className="text-slate-500 italic">No especificado</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {isMe ? (
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20 select-none">
                              🛡️ Administrador
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold italic">
                              Tú (Sesión activa)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role?.id || ''}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer capitalize disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isUpdating}
                            >
                              <option value="">-- Sin Rol --</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id} className="capitalize">
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500"></div>
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

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-300 font-bold">{currentPage}</span> de <span className="text-slate-300 font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &lt;&lt; Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente &gt;&gt;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
