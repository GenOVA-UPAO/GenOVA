import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [role, setRole] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Validation errors
  const [validationError, setValidationError] = useState({ fullName: '', email: '' })

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
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
        setError('No se pudo cargar la información de perfil.')
      }
    } catch (err) {
      setError('Error al conectar con el servidor.')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setError('')
    setSuccess('')
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
          email: email.trim().lowerCase ? email.trim().toLowerCase() : email.trim()
        })
      })

      if (response.status === 200) {
        const data = await response.json()
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setSuccess('¡Perfil actualizado con éxito!')
        // Auto fade success message
        setTimeout(() => setSuccess(''), 5000)
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.detail || 'Error al actualizar el perfil.')
      }
    } catch (err) {
      setError('Error de conexión con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!fullName) return 'U'
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  // Format creation date nicely
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Configuración de Perfil
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Modifica tus datos de contacto y visualiza el estado general de tu cuenta.
        </p>
      </div>

      {/* Global Banner notifications */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2 shadow-sm animate-fade-in">
          <span>✅</span>
          <span className="font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2 shadow-sm animate-fade-in">
          <span>⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
              <p className="text-xs text-slate-400">Cargando perfil...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Header info / Avatar */}
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

            {/* Inputs */}
            <div className="grid grid-cols-1 gap-6">
              {/* Full Name */}
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

              {/* Email */}
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

            {/* Action buttons */}
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
    </div>
  )
}
