import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEmailValid = emailRegex.test(email)
  const isPasswordValid = passwordRegex.test(password)

  const showEmailError = touched.email && email.length > 0 && !isEmailValid
  const showPasswordError = touched.password && password.length > 0 && !isPasswordValid

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    setServerError('')

    if (!isEmailValid || !isPasswordValid || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.status === 201) {
        if (data?.access_token) {
          localStorage.setItem('genova_token', data.access_token)
        }
        navigate('/dashboard')
        return
      }

      setServerError(data?.message || 'No se pudo completar el registro.')
    } catch (error) {
      setServerError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Crear cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Regístrate para guardar y acceder a tus OVAs.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block text-sm font-medium text-slate-700">
            Correo
            <input
              type="email"
              placeholder="estudiante@upao.edu"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setTouched((prev) => ({ ...prev, email: true }))
                if (serverError) setServerError('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {showEmailError && (
              <span className="mt-1 block text-xs text-rose-600">
                Ingresa un correo con formato válido.
              </span>
            )}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setTouched((prev) => ({ ...prev, password: true }))
                if (serverError) setServerError('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {showPasswordError ? (
              <span className="mt-1 block text-xs text-rose-600">
                Mínimo 8 caracteres con letras y números.
              </span>
            ) : (
              <span className="mt-1 block text-xs text-slate-500">
                Usa al menos 8 caracteres con letras y números.
              </span>
            )}
          </label>

          {serverError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!isEmailValid || !isPasswordValid || isSubmitting}
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-slate-900">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
