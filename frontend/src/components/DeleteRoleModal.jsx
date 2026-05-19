export function DeleteRoleModal({
  deletingRole,
  roles,
  reassignRoleId,
  deleteError,
  isDeleting,
  onReassignRoleChange,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()}></div>

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
                onChange={onReassignRoleChange}
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

        {deleteError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 mt-4">
            {deleteError}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
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
  )
}
