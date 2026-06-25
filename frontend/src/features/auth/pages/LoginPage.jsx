import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { markLoggedIn } from '@/features/auth/services/auth.js'
import { apiFetch } from '@/core/lib/http.js'
import { resendVerification } from '@/features/auth/services/verification.js'
import { loginSchema } from '@/features/auth/schemas/auth.js'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { PasswordInput } from '@/core/components/ui/password-input'
import { Label } from '@/core/components/ui/label'
import { Alert, AlertDescription } from '@/core/components/ui/alert'
import { VerifyEmailNotice } from '@/features/auth/components/VerifyEmailNotice.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async ({ email, password }) => {
    setServerError('')
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

      if (response.status === 403 && data?.error === 'email_not_verified') {
        setUnverifiedEmail(email)
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
    }
  }

  if (unverifiedEmail) {
    return (
      <VerifyEmailNotice
        email={unverifiedEmail}
        onResend={() => resendVerification(unverifiedEmail)}
      />
    )
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div className="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · UPAO
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">Accede para continuar al curso de ML.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              placeholder="estudiante@genova.ai"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center justify-end">
            <Link to="/recuperar-contrasena" className="text-sm font-medium text-foreground hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {isSubmitting ? 'Ingresando…' : 'Entrar'}
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
