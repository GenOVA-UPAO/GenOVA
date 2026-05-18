import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const AVAILABLE_PERMISSIONS = [
  { id: 'create_ova', label: 'Crear nuevos OVAs', desc: 'Permite iniciar la generación de nuevos contenidos de ML.' },
  { id: 'view_ova', label: 'Ver OVAs propios', desc: 'Permite consultar el historial de OVAs generados.' },
  { id: 'export_ova', label: 'Exportar OVAs (SCORM)', desc: 'Permite descargar los OVAs empaquetados para Canvas.' },
  { id: 'manage_users', label: 'Ver/Modificar usuarios', desc: 'Permite reasignar roles y ver lista de usuarios.' },
  { id: 'manage_roles', label: 'Gestionar roles', desc: 'Permite crear, editar y eliminar roles del sistema.' }
]

export function AdminRolesPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  // Deletion State
  const [deletingRole, setDeletingRole] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [reassignRoleId, setReassignRoleId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Form State
  const [roleName, setRoleName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      } else {
        setError('No se pudo cargar la lista de roles.')
      }
    } catch (err) {
      setError('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const handleCheckboxChange = (permId) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== permId))
    } else {
      setSelectedPermissions([...selectedPermissions, permId])
    }
  }

  const handleOpenModal = () => {
    setEditingRole(null)
    setRoleName('')
    setSelectedPermissions([])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleEditClick = (role) => {
    setEditingRole(role)
    setRoleName(role.name)
    setSelectedPermissions(role.permissions || [])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleDeleteClick = (role) => {
    setDeletingRole(role)
    setReassignRoleId('')
    setDeleteError('')
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingRole) return

    const isReassign = deletingRole.user_count > 0
    if (isReassign && !reassignRoleId) {
      setDeleteError('Por favor selecciona un rol de destino.')
      return
    }

    setIsDeleting(true)
    setDeleteError('')

    const token = getToken()
    const url = isReassign
      ? `${apiBaseUrl}/api/roles/${deletingRole.id}?reassign_to_id=${reassignRoleId}`
      : `${apiBaseUrl}/api/roles/${deletingRole.id}`

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.status === 204) {
        // Successful deletion
        if (isReassign) {
          // Increment the user_count of target role in state by migrated users
          setRoles((prev) =>
            prev
              .map((r) =>
                r.id === reassignRoleId
                  ? { ...r, user_count: (r.user_count || 0) + deletingRole.user_count }
                  : r
              )
              .filter((r) => r.id !== deletingRole.id)
          )
        } else {
          // Clean deletion without migration
          setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id))
        }
        setIsDeleteModalOpen(false)
      } else {
        const data = await response.json().catch(() => ({}))
        setDeleteError(data.detail || 'Ocurrió un error inesperado al eliminar el rol.')
      }
    } catch (err) {
      setDeleteError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = roleName.trim()
    if (!name) {
      setFormError('El nombre del rol es obligatorio.')
      return
    }
    if (name.length > 64) {
      setFormError('El nombre del rol no debe superar los 64 caracteres.')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    const token = getToken()
    const isEdit = !!editingRole
    const url = isEdit ? `${apiBaseUrl}/api/roles/${editingRole.id}` : `${apiBaseUrl}/api/roles`
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          permissions: selectedPermissions
        })
      })

      const data = await response.json()

      if (response.status === 200 || response.status === 201) {
        if (isEdit) {
          // Update in local state
          setRoles((prev) => prev.map((r) => r.id === editingRole.id ? data : r))
        } else {
          // Add to local state
          setRoles((prev) => [...prev, data])
        }
        setIsModalOpen(false)
      } else if (response.status === 409) {
        setFormError('Ya existe un rol con ese nombre.')
      } else {
        setFormError(data.detail || `Ocurrió un error inesperado al ${isEdit ? 'actualizar' : 'crear'} el rol.`)
      }
    } catch (err) {
      setFormError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestión de Roles</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Define los conjuntos de permisos y configuraciones de acceso para los diferentes perfiles del sistema.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 transition-all cursor-pointer"
        >
          <span className="mr-2 text-lg font-bold">+</span> Nuevo rol
        </button>
      </div>

      {/* Roles List Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
              <p className="text-xs text-slate-500">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-rose-400 font-medium">{error}</p>
              <button
                onClick={fetchRoles}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4">Nombre del Rol</th>
                  <th scope="col" className="px-6 py-4">Descripción</th>
                  <th scope="col" className="px-6 py-4">Usuarios</th>
                  <th scope="col" className="px-6 py-4">Permisos Asignados</th>
                  <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-white flex items-center gap-2">
                      {role.name === 'administrador' ? (
                        <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                      ) : role.name === 'usuario' ? (
                        <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                      )}
                      <span className="capitalize">{role.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                      {role.description || 'Sin descripción'}
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {role.user_count ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.map((perm) => (
                            <span
                              key={perm}
                              className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20"
                            >
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-600">Ninguno</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-400 space-x-3">
                      {['administrador', 'usuario'].includes(role.name) ? (
                        <span className="text-xs text-slate-600 italic">Sistema</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditClick(role)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClick(role)}
                            className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-xs font-semibold"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleCloseModal}></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1">
              {editingRole ? `Editar rol: ${editingRole.name}` : 'Crear nuevo rol'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              {editingRole
                ? 'Ajusta el nombre y la selección de permisos para este perfil del sistema.'
                : 'Elige un nombre único y asigna los permisos necesarios para este perfil.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Nombre del rol
                </label>
                <input
                  type="text"
                  placeholder="Ej. docente, supervisor..."
                  value={roleName}
                  onChange={(e) => {
                    setRoleName(e.target.value)
                    if (formError) setFormError('')
                  }}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                  disabled={isSubmitting}
                />
              </div>

              {/* Permissions list */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Permisos del rol
                </label>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-950/45 p-3 hover:border-slate-700/85 hover:bg-slate-950/80 transition-all cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => handleCheckboxChange(perm.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer"
                        disabled={isSubmitting}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{perm.label}</span>
                        <span className="text-xs text-slate-400 mt-0.5">{perm.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error messages */}
              {formError && (
                <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs font-medium text-rose-400">
                  {formError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !roleName.trim()}
                >
                  {isSubmitting
                    ? editingRole
                      ? 'Guardando...'
                      : 'Creando...'
                    : editingRole
                    ? 'Guardar cambios'
                    : 'Crear rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Modal */}
      {isDeleteModalOpen && deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1">
              ¿Eliminar rol: <span className="capitalize">{deletingRole.name}</span>?
            </h2>

            {deletingRole.user_count > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-400">
                  <div className="flex gap-2.5">
                    <span className="text-lg font-bold">⚠️</span>
                    <div>
                      <p className="font-semibold">Reasignación requerida</p>
                      <p className="text-xs text-amber-500 mt-0.5">
                        Este rol tiene <span className="font-bold">{deletingRole.user_count}</span> usuario(s) asignado(s) actualmente. Para poder eliminarlo, debes migrar sus usuarios a otro rol activo.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Reasignar usuarios a:
                  </label>
                  <select
                    value={reassignRoleId}
                    onChange={(e) => {
                      setReassignRoleId(e.target.value)
                      if (deleteError) setDeleteError('')
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
                    disabled={isDeleting}
                  >
                    <option value="">-- Selecciona un rol de destino --</option>
                    {roles
                      .filter((r) => r.id !== deletingRole.id)
                      .map((r) => (
                        <option key={r.id} value={r.id} className="capitalize">
                          {r.name} ({r.user_count ?? 0} usuarios)
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-4 mb-6">
                Esta acción es permanente e irreversible. Se borrarán todas las configuraciones del rol y no hay usuarios asignados que se verán afectados.
              </p>
            )}

            {/* Error messages */}
            {deleteError && (
              <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs font-medium text-rose-400 mt-4">
                {deleteError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors cursor-pointer"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-500 hover:shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting || (deletingRole.user_count > 0 && !reassignRoleId)}
              >
                {isDeleting
                  ? 'Eliminando...'
                  : deletingRole.user_count > 0
                  ? 'Reasignar y eliminar'
                  : 'Eliminar rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
