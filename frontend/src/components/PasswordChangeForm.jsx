export function PasswordChangeForm({
  currentPassword,
  newPassword,
  confirmPassword,
  validationError,
  savingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
      <form onSubmit={onSubmit} className="p-6 sm:p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Seguridad de la Cuenta
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Actualiza tu contraseña periódicamente para mantener tu cuenta protegida.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Contraseña Actual
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={onCurrentPasswordChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${validationError.currentPassword ? 'border-rose-400' : 'border-slate-200'}`}
              disabled={savingPassword}
              placeholder="••••••••"
            />
            {validationError.currentPassword && (
              <p className="text-xs text-rose-600 font-medium">{validationError.currentPassword}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={onNewPasswordChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${validationError.newPassword ? 'border-rose-400' : 'border-slate-200'}`}
              disabled={savingPassword}
              placeholder="••••••••"
            />
            <p className="text-xs text-slate-400">Mínimo 8 caracteres alfanuméricos (letras y números)</p>
            {validationError.newPassword && (
              <p className="text-xs text-rose-600 font-medium">{validationError.newPassword}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={onConfirmPasswordChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${validationError.confirmPassword ? 'border-rose-400' : 'border-slate-200'}`}
              disabled={savingPassword}
              placeholder="••••••••"
            />
            {validationError.confirmPassword && (
              <p className="text-xs text-rose-600 font-medium">{validationError.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            disabled={savingPassword}
          >
            {savingPassword ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                Actualizando...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
