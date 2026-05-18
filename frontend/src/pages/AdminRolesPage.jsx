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
    setRoleName('')
    setSelectedPermissions([])
    setFormError('')
    setIsModalOpen(true)
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
    try {
      const response = await fetch(`${apiBaseUrl}/api/roles`, {
        method: 'POST',
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

      if (response.status === 201) {
        // Add to local list and close
        setRoles((prev) => [...prev, data])
        setIsModalOpen(false)
      } else if (response.status === 409) {
        setFormError('Ya existe un rol con ese nombre.')
      } else {
        setFormError(data.detail || 'Ocurrió un error inesperado al crear el rol.')
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
                          <button className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer text-xs font-semibold">
                            Editar
                          </button>
                          <button className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-xs font-semibold">
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

      {/* Create Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleCloseModal}></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-1">Crear nuevo rol</h2>
            <p className="text-xs text-slate-400 mb-6">
              Elige un nombre único y asigna los permisos necesarios para este perfil.
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
                  {isSubmitting ? 'Creando...' : 'Crear rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
