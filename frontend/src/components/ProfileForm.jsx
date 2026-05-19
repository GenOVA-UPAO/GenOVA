export function ProfileForm({ fullName, email, role, createdAt, validationError, saving, onFullNameChange, onEmailChange, onReset, onSubmit, getInitials, formatDate }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
      <form onSubmit={onSubmit} className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg">
            {getInitials()}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {fullName || 'Usuario'}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 capitalize border border-indigo-100">
                Rol: {role}
              </span>
              <span className="text-xs text-slate-400">
                Miembro desde el {formatDate(createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nombre Completo
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={onFullNameChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${validationError.fullName ? 'border-rose-400' : 'border-slate-200'}`}
              disabled={saving}
              placeholder="Ej: Juan Pérez"
            />
            {validationError.fullName && (
              <p className="text-xs text-rose-600 font-medium">{validationError.fullName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={onEmailChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${validationError.email ? 'border-rose-400' : 'border-slate-200'}`}
              disabled={saving}
              placeholder="usuario@correo.com"
            />
            {validationError.email && (
              <p className="text-xs text-rose-600 font-medium">{validationError.email}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            disabled={saving}
          >
            Restablecer
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-700 hover:shadow-indigo-700/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
