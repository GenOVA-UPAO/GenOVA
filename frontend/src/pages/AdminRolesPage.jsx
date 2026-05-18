import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'
import { toast } from 'sonner'

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

  const [deletingRole, setDeletingRole] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [reassignRoleId, setReassignRoleId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
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
    setRoleDescription('')
    setSelectedPermissions([])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleEditClick = (role) => {
    setEditingRole(role)
    setRoleName(role.name)
    setRoleDescription(role.description || '')
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
        if (isReassign) {
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
          setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id))
        }
        setIsDeleteModalOpen(false)
        toast.success('Rol eliminado con éxito')
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
          description: roleDescription,
          permissions: selectedPermissions
        })
      })

      const data = await response.json()

      if (response.status === 200 || response.status === 201) {
        if (isEdit) {
          setRoles((prev) => prev.map((r) => r.id === editingRole.id ? data : r))
          toast.success('Rol actualizado con éxito')
        } else {
          setRoles((prev) => [...prev, data])
          toast.success('Rol creado con éxito')
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Gestión de Roles</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Define los conjuntos de permisos y configuraciones de acceso para los diferentes perfiles del sistema.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-700 hover:shadow-indigo-700/20 transition-all cursor-pointer"
        >
          <span className="mr-1.5 text-lg font-bold">+</span> Nuevo rol
        </button>
      </div>


      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
              <p className="text-xs text-slate-400">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={fetchRoles}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">
                <tr>
                  <th scope="col" className="px-5 py-4 w-[15%] whitespace-nowrap">Nombre del Rol</th>
                  <th scope="col" className="px-5 py-4 w-[25%] min-w-[200px] whitespace-nowrap">Descripción</th>
                  <th scope="col" className="px-5 py-4 w-[10%] whitespace-nowrap">Usuarios</th>
                  <th scope="col" className="px-6 py-4 w-[40%] min-w-[380px] whitespace-nowrap">Permisos Asignados</th>
                  <th scope="col" className="px-5 py-4 w-[10%] whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        {role.name === 'administrador' ? (
                          <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                        ) : role.name === 'usuario' ? (
                          <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                        )}
                        <span className="capitalize">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-sm align-middle text-center">
                      <p className="line-clamp-2">{role.description || 'Sin descripción'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium align-middle text-center">
                      {role.user_count ?? 0}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.map((perm) => {
                            const permLabel = AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm
                            return (
                              <span
                                key={perm}
                                className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100"
                              >
                                {permLabel}
                              </span>
                            )
                          })
                        ) : (
                          <span className="text-xs text-slate-400">Ninguno</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400 space-x-3 align-middle text-center">
                      {['administrador', 'usuario'].includes(role.name) ? (
                        <span className="text-xs text-slate-400 italic">Sistema</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditClick(role)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClick(role)}
                            className="text-rose-600 hover:text-rose-800 transition-colors cursor-pointer text-xs font-semibold"
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


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>


          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {editingRole ? `Editar rol: ${editingRole.name}` : 'Crear nuevo rol'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {editingRole
                ? 'Ajusta el nombre y la selección de permisos para este perfil del sistema.'
                : 'Elige un nombre único y asigna los permisos necesarios para este perfil.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-colors"
                  disabled={isSubmitting}
                />
              </div>


              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  placeholder="Breve descripción del propósito de este rol..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-colors resize-none h-12"
                  disabled={isSubmitting}
                />
              </div>


              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Permisos del rol
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => handleCheckboxChange(perm.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        disabled={isSubmitting}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{perm.label}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{perm.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>


              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                  {formError}
                </div>
              )}


              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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


      {isDeleteModalOpen && deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}></div>


          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              ¿Eliminar rol: <span className="capitalize">{deletingRole.name}</span>?
            </h2>

            {deletingRole.user_count > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="flex gap-2.5">
                    <span className="text-lg font-bold">⚠️</span>
                    <div>
                      <p className="font-semibold">Reasignación requerida</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Este rol tiene <span className="font-bold">{deletingRole.user_count}</span> usuario(s) asignado(s) actualmente. Para poder eliminarlo, debes migrar sus usuarios a otro rol activo.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Reasignar usuarios a:
                  </label>
                  <select
                    value={reassignRoleId}
                    onChange={(e) => {
                      setReassignRoleId(e.target.value)
                      if (deleteError) setDeleteError('')
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
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
              <p className="text-sm text-slate-500 mt-4 mb-6">
                Esta acción es permanente e irreversible. Se borrarán todas las configuraciones del rol y no hay usuarios asignados que se verán afectados.
              </p>
            )}

            {/* Error messages */}
            {deleteError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 mt-4">
                {deleteError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
