import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { markLoggedIn } from '../lib/auth.js'
import { apiFetch } from '../lib/http.js'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEmailValid = emailRegex.test(email)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    setServerError('')

    if (!isEmailValid || password.length === 0 || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.status === 200) {
        markLoggedIn()
        navigate('/dashboard')
        return
      }

      if (response.status === 403 && data?.retry_after_minutes) {
        setServerError(
          `Cuenta bloqueada. Intenta de nuevo en ${data.retry_after_minutes} minuto${data.retry_after_minutes !== 1 ? 's' : ''}.`
        )
        return
      }

      setServerError(data?.message || 'No se pudo iniciar sesión.')
    } catch {
      setServerError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Accede para continuar al curso de ML.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block text-sm font-medium text-slate-700">
            Correo
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="estudiante@genova.ai"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setTouched((prev) => ({ ...prev, email: true }))
                if (serverError) setServerError('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {touched.email && email.length > 0 && !isEmailValid && (
              <span className="mt-1 block text-xs text-rose-600">
                Ingresa un correo con formato válido.
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setTouched((prev) => ({ ...prev, password: true }))
                if (serverError) setServerError('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {serverError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!isEmailValid || password.length === 0 || isSubmitting}
          >
            {isSubmitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {isSubmitting ? 'Ingresando...' : 'Entrar'}
          </button>
          <p className="text-center text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-slate-900">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
