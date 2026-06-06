import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { markLoggedIn } from '../lib/auth.js'
import { apiFetch } from '../lib/http.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false })
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFullNameValid = fullName.trim().length >= 3 && fullName.trim().length <= 100
  const isEmailValid = emailRegex.test(email)
  const isPasswordValid = passwordRegex.test(password)

  const showFullNameError = touched.fullName && fullName.length > 0 && !isFullNameValid
  const showEmailError = touched.email && email.length > 0 && !isEmailValid
  const showPasswordError = touched.password && password.length > 0 && !isPasswordValid

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ fullName: true, email: true, password: true })
    setServerError('')

    if (!isFullNameValid || !isEmailValid || !isPasswordValid || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName.trim(), email, password }),
      })
      const data = await response.json()

      if (response.status === 201) {
        markLoggedIn()
        navigate('/dashboard')
        return
      }

      setServerError(data?.message || 'No se pudo completar el registro.')
    } catch {
      setServerError('No se pudo conectar con el servidor. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Regístrate para guardar y acceder a tus OVAs.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Ejemplo: Solange"
              value={fullName}
              aria-invalid={showFullNameError}
              onChange={(event) => {
                setFullName(event.target.value)
                setTouched((prev) => ({ ...prev, fullName: true }))
                if (serverError) setServerError('')
              }}
            />
            {showFullNameError ? (
              <p className="text-xs text-destructive">
                El nombre completo debe tener al menos 3 caracteres y máximo 100.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="estudiante@upao.edu"
              value={email}
              aria-invalid={showEmailError}
              onChange={(event) => {
                setEmail(event.target.value)
                setTouched((prev) => ({ ...prev, email: true }))
                if (serverError) setServerError('')
              }}
            />
            {showEmailError ? (
              <p className="text-xs text-destructive">Ingresa un correo con formato válido.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              aria-invalid={showPasswordError}
              onChange={(event) => {
                setPassword(event.target.value)
                setTouched((prev) => ({ ...prev, password: true }))
                if (serverError) setServerError('')
              }}
            />
            <p className="text-xs text-muted-foreground">
              {showPasswordError
                ? <span className="text-destructive">Mínimo 8 caracteres con letras y números.</span>
                : 'Usa al menos 8 caracteres con letras y números.'}
            </p>
          </div>

          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!isFullNameValid || !isEmailValid || !isPasswordValid || isSubmitting}
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
