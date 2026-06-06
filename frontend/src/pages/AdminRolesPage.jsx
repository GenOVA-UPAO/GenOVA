import { useRoles } from '../hooks/useRoles.js'
import { AVAILABLE_PERMISSIONS } from '../lib/permissions.js'
import { RoleFormModal } from '../components/RoleFormModal.jsx'
import { DeleteRoleModal } from '../components/DeleteRoleModal.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AdminRolesPage() {
  const {
    roles, loading, error, isModalOpen, editingRole, deletingRole,
    isDeleteModalOpen, reassignRoleId, deleteError, isDeleting,
    roleName, setRoleName, roleDescription, setRoleDescription,
    selectedPermissions, formError, setFormError, isSubmitting,
    fetchRoles, handlePermissionToggle, handleOpenModal, handleEditClick,
    handleDeleteClick, handleConfirmDelete, handleCloseModal, handleSubmit,
    setIsDeleteModalOpen, setReassignRoleId, setDeleteError,
  } = useRoles()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gestión de Roles</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Define los conjuntos de permisos y configuraciones de acceso para los diferentes perfiles del sistema.
          </p>
        </div>
        <Button onClick={handleOpenModal}>
          <span className="mr-1 text-base font-bold">+</span> Nuevo rol
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <p className="text-xs text-muted-foreground">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRoles}>Reintentar</Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[15%]">Nombre del Rol</TableHead>
                  <TableHead className="w-[25%]">Descripción</TableHead>
                  <TableHead className="w-[10%] text-center">Usuarios</TableHead>
                  <TableHead className="w-[40%]">Permisos Asignados</TableHead>
                  <TableHead className="w-[10%] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${role.name === 'administrador' ? 'bg-primary' : role.name === 'usuario' ? 'bg-teal-500' : 'bg-muted-foreground'}`} />
                        <span className="capitalize">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-sm">
                      <p className="line-clamp-2">{role.description || 'Sin descripción'}</p>
                    </TableCell>
                    <TableCell className="text-center font-medium">{role.user_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions?.length > 0 ? (
                          role.permissions.map((perm) => {
                            const label = AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm
                            return (
                              <Badge key={perm} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                                {label}
                              </Badge>
                            )
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground">Ninguno</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center space-x-2">
                      {['administrador', 'usuario'].includes(role.name) ? (
                        <span className="text-xs text-muted-foreground italic">Sistema</span>
                      ) : (
                        <>
                          <Button variant="ghost" size="xs" onClick={() => handleEditClick(role)} className="text-primary">Editar</Button>
                          <Button variant="ghost" size="xs" onClick={() => handleDeleteClick(role)} className="text-destructive">Eliminar</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <RoleFormModal
          editingRole={editingRole}
          roleName={roleName}
          roleDescription={roleDescription}
          selectedPermissions={selectedPermissions}
          formError={formError}
          isSubmitting={isSubmitting}
          onRoleNameChange={(e) => { setRoleName(e.target.value); if (formError) setFormError('') }}
          onRoleDescriptionChange={(e) => setRoleDescription(e.target.value)}
          onPermissionToggle={handlePermissionToggle}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />
      ) : null}

      {isDeleteModalOpen && deletingRole ? (
        <DeleteRoleModal
          deletingRole={deletingRole}
          roles={roles}
          reassignRoleId={reassignRoleId}
          deleteError={deleteError}
          isDeleting={isDeleting}
          onReassignRoleChange={(e) => { setReassignRoleId(e.target.value); if (deleteError) setDeleteError('') }}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      ) : null}
    </div>
  )
}
