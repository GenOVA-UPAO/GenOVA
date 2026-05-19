import { useRoles } from '../hooks/useRoles.js'
import { AVAILABLE_PERMISSIONS } from '../lib/permissions.js'
import { RoleFormModal } from '../components/RoleFormModal.jsx'
import { DeleteRoleModal } from '../components/DeleteRoleModal.jsx'

export function AdminRolesPage() {
  const {
    roles,
    loading,
    error,
    isModalOpen,
    editingRole,
    deletingRole,
    isDeleteModalOpen,
    reassignRoleId,
    deleteError,
    isDeleting,
    roleName,
    setRoleName,
    roleDescription,
    setRoleDescription,
    selectedPermissions,
    formError,
    isSubmitting,
    fetchRoles,
    handlePermissionToggle,
    handleOpenModal,
    handleEditClick,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseModal,
    handleSubmit,
    setIsDeleteModalOpen,
    setReassignRoleId,
    setDeleteError,
  } = useRoles()

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
        <RoleFormModal
          editingRole={editingRole}
          roleName={roleName}
          roleDescription={roleDescription}
          selectedPermissions={selectedPermissions}
          formError={formError}
          isSubmitting={isSubmitting}
          onRoleNameChange={(e) => {
            setRoleName(e.target.value)
          }}
          onRoleDescriptionChange={(e) => setRoleDescription(e.target.value)}
          onPermissionToggle={handlePermissionToggle}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />
      )}

      {isDeleteModalOpen && deletingRole && (
        <DeleteRoleModal
          deletingRole={deletingRole}
          roles={roles}
          reassignRoleId={reassignRoleId}
          deleteError={deleteError}
          isDeleting={isDeleting}
          onReassignRoleChange={(e) => {
            setReassignRoleId(e.target.value)
            if (deleteError) setDeleteError('')
          }}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  )
}
