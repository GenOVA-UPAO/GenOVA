import { AVAILABLE_PERMISSIONS } from '../lib/permissions'

export function RoleFormModal({
  editingRole,
  roleName,
  roleDescription,
  selectedPermissions,
  formError,
  isSubmitting,
  onRoleNameChange,
  onRoleDescriptionChange,
  onPermissionToggle,
  onSubmit,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {editingRole ? `Editar rol: ${editingRole.name}` : 'Crear nuevo rol'}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {editingRole
            ? 'Ajusta el nombre y la selección de permisos para este perfil del sistema.'
            : 'Elige un nombre único y asigna los permisos necesarios para este perfil.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Nombre del rol
            </label>
            <input
              type="text"
              placeholder="Ej. docente, supervisor..."
              value={roleName}
              onChange={onRoleNameChange}
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
              onChange={onRoleDescriptionChange}
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
                    onChange={() => onPermissionToggle(perm.id)}
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
              onClick={onClose}
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
  )
}
