import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'
import { toast } from 'sonner'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [role, setRole] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [validationError, setValidationError] = useState({ fullName: '', email: '' })
  const [passwordValidationError, setPasswordValidationError] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const fetchProfile = async () => {
    setLoading(true)
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.status === 200) {
        const data = await response.json()
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setCreatedAt(data.created_at || '')
        setRole(data.role || 'usuario')
      } else {
        toast.error('No se pudo cargar la información de perfil.')
      }
    } catch (err) {
      toast.error('Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const validate = () => {
    const errors = { fullName: '', email: '' }
    let isValid = true

    if (fullName.trim().length < 3) {
      errors.fullName = 'El nombre completo debe tener al menos 3 caracteres.'
      isValid = false
    }

    if (!email.trim()) {
      errors.email = 'El correo electrónico es requerido.'
      isValid = false
    } else if (!/@.*\./.test(email)) {
      errors.email = 'El formato del correo electrónico es inválido.'
      isValid = false
    }

    setValidationError(errors)
    return isValid
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase()
        })
      })

      if (response.status === 200) {
        const data = await response.json()
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        toast.success('¡Perfil actualizado con éxito!')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar el perfil.')
      }
    } catch (err) {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  const validatePassword = () => {
    const errors = { currentPassword: '', newPassword: '', confirmPassword: '' }
    let isValid = true

    if (!currentPassword) {
      errors.currentPassword = 'La contraseña actual es requerida.'
      isValid = false
    }

    if (newPassword.length < 8) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres.'
      isValid = false
    } else if (!(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword))) {
      errors.newPassword = 'La nueva contraseña debe contener letras y números (alfanumérica).'
      isValid = false
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'La confirmación no coincide con la nueva contraseña.'
      isValid = false
    }

    setPasswordValidationError(errors)
    return isValid
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!validatePassword()) return

    setSavingPassword(true)
    const token = getToken()

    try {
      const response = await fetch(`${apiBaseUrl}/api/users/me/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      })

      if (response.status === 200) {
        toast.success('¡Contraseña actualizada con éxito!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.detail || 'Error al actualizar la contraseña.')
      }
    } catch (err) {
      toast.error('Error de conexión con el servidor.')
    } finally {
      setSavingPassword(false)
    }
  }

  const getInitials = () => {
    if (!fullName) return 'U'
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Configuración de Perfil
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Modifica tus datos de contacto y administra la seguridad de tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
              <p className="text-xs text-slate-400">Cargando perfil...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProfileSubmit} className="p-6 sm:p-8 space-y-6">

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
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${
                    validationError.fullName ? 'border-rose-400' : 'border-slate-200'
                  }`}
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
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${
                    validationError.email ? 'border-rose-400' : 'border-slate-200'
                  }`}
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
                onClick={fetchProfile}
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
        )}
      </div>


      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <form onSubmit={handlePasswordSubmit} className="p-6 sm:p-6 space-y-6">
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
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${
                    passwordValidationError.currentPassword ? 'border-rose-400' : 'border-slate-200'
                  }`}
                  disabled={savingPassword}
                  placeholder="••••••••"
                />
                {passwordValidationError.currentPassword && (
                  <p className="text-xs text-rose-600 font-medium">{passwordValidationError.currentPassword}</p>
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
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${
                    passwordValidationError.newPassword ? 'border-rose-400' : 'border-slate-200'
                  }`}
                  disabled={savingPassword}
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-400">Mínimo 8 caracteres alfanuméricos (letras y números)</p>
                {passwordValidationError.newPassword && (
                  <p className="text-xs text-rose-600 font-medium">{passwordValidationError.newPassword}</p>
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors ${
                    passwordValidationError.confirmPassword ? 'border-rose-400' : 'border-slate-200'
                  }`}
                  disabled={savingPassword}
                  placeholder="••••••••"
                />
                {passwordValidationError.confirmPassword && (
                  <p className="text-xs text-rose-600 font-medium">{passwordValidationError.confirmPassword}</p>
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
      )}
      </div>
    </div>
  )
}
