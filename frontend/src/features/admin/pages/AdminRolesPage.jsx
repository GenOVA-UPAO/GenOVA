import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useRoles } from '@/features/admin/hooks/useRoles.js'
import { AVAILABLE_PERMISSIONS } from '@/core/lib/permissions.js'
import { RoleFormModal } from '@/features/admin/components/RoleFormModal.jsx'
import { DeleteRoleModal } from '@/features/admin/components/DeleteRoleModal.jsx'
import { Button } from '@/core/components/ui/button'
import { apiFetch } from '@/core/lib/http.js'

function RegistrationModeCard() {
  const [tesis, setTesis] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch('/api/admin/registration-mode')
      .then((r) => r.json())
      .then((d) => setTesis((d.default_registration_role ?? 'usuarios_prueba') === 'usuarios_prueba'))
      .catch(() => {})
  }, [])

  async function toggle() {
    const next = !tesis
    setSaving(true)
    try {
      await apiFetch('/api/admin/registration-mode', {
        method: 'PUT',
        body: JSON.stringify({ default_registration_role: next ? 'usuarios_prueba' : 'usuario' }),
      })
      setTesis(next)
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Modo tesis</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tesis
            ? 'Nuevos registros reciben el rol "Usuarios Prueba" automáticamente.'
            : 'Nuevos registros reciben el rol "usuario" (acceso completo).'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={tesis}
        disabled={saving}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 focus-visible:outline-none
          ${tesis ? 'bg-primary' : 'bg-input'} ${saving ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
      >
        <span className={`block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200
          ${tesis ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

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

  const getRoleColor = (name) => {
    switch (name.toLowerCase()) {
      case 'administrador': return 'bg-primary text-primary-foreground border-primary/20 shadow-md shadow-primary/20'
      case 'usuario': return 'bg-accent-brand text-white border-accent-brand/20 shadow-md shadow-accent-brand/20'
      default: return 'bg-emerald-500 text-white border-emerald-500/20 shadow-md shadow-emerald-500/20'
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mx-auto max-w-5xl pb-10"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Gestión de Roles</h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Define los conjuntos de permisos y configuraciones de acceso para los diferentes perfiles del sistema.
          </p>
        </div>
        <Button onClick={handleOpenModal} className="shadow-md font-bold">
          <span className="mr-2 text-lg leading-none">+</span> Nuevo rol
        </Button>
      </div>

      <RegistrationModeCard />

      <div className="space-y-5">
        {loading ? (
          <div className="flex h-64 items-center justify-center glass-card rounded-3xl">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm" />
              <p className="text-sm font-bold text-muted-foreground">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center glass-card rounded-3xl border-destructive/20 bg-destructive/5">
            <div className="max-w-md space-y-4">
              <p className="text-sm text-destructive font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRoles} className="shadow-sm">Reintentar</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {roles.map((role) => (
              <div key={role.id} className="rounded-3xl border-2 border-border/40 bg-card p-6 glass-card shadow-sm hover:border-primary/20 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${getRoleColor(role.name)}`}>
                      <span className="text-lg font-display font-bold uppercase">{role.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg font-display capitalize flex items-center gap-2">
                        {role.name}
                        {['administrador', 'usuario'].includes(role.name.toLowerCase()) && (
                          <span className="bg-muted px-2 py-0.5 rounded-md text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Sistema</span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{role.user_count ?? 0} usuarios activos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(role)} className="shadow-sm border-primary/20 hover:bg-primary/5 text-primary">
                      Editar permisos
                    </Button>
                    {!['administrador', 'usuario'].includes(role.name.toLowerCase()) && (
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(role)} className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm">
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
                
                {role.description && (
                  <p className="text-sm text-muted-foreground font-medium mb-4">{role.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {role.permissions?.length > 0 ? (
                    role.permissions.map((perm) => {
                      const label = AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm
                      return (
                        <span key={perm} className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary shadow-sm">
                          {label}
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full">Sin permisos asignados</span>
                  )}
                </div>
              </div>
            ))}
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
    </motion.div>
  )
}
