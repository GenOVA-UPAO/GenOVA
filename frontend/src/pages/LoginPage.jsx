import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { markLoggedIn } from '../lib/auth.js'
import { apiFetch } from '../lib/http.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

    if (!isEmailValid || password.length === 0 || isSubmitting) return

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
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">Accede para continuar al curso de ML.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="estudiante@genova.ai"
              value={email}
              aria-invalid={touched.email && email.length > 0 && !isEmailValid}
              onChange={(event) => {
                setEmail(event.target.value)
                setTouched((prev) => ({ ...prev, email: true }))
                if (serverError) setServerError('')
              }}
            />
            {touched.email && email.length > 0 && !isEmailValid ? (
              <p className="text-xs text-destructive">Ingresa un correo con formato válido.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
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
            />
          </div>

          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!isEmailValid || password.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {isSubmitting ? 'Ingresando...' : 'Entrar'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium text-foreground hover:underline">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
