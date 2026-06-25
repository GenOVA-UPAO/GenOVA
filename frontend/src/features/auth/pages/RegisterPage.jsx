import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apiFetch } from '@/core/lib/http.js'
import { resendVerification } from '@/features/auth/services/verification.js'
import { registerSchema } from '@/features/auth/schemas/auth.js'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { PasswordInput } from '@/core/components/ui/password-input'
import { Label } from '@/core/components/ui/label'
import { Alert, AlertDescription } from '@/core/components/ui/alert'
import { VerifyEmailNotice } from '@/features/auth/components/VerifyEmailNotice.jsx'

export function RegisterPage() {
  const [serverError, setServerError] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '' },
  })

  const onSubmit = async ({ full_name, email, password }) => {
    setServerError('')
    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: full_name.trim(), email, password }),
      })
      const data = await response.json()

      if (response.status === 201) {
        setRegisteredEmail(email)
        return
      }

      setServerError(data?.message || 'No se pudo completar el registro.')
    } catch {
      setServerError('No se pudo conectar con el servidor. Intenta de nuevo.')
    }
  }

  if (registeredEmail) {
    return (
      <VerifyEmailNotice
        email={registeredEmail}
        onResend={() => resendVerification(registeredEmail)}
      />
    )
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Regístrate para guardar y acceder a tus OVAs.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Ejemplo: Solange"
              aria-invalid={!!errors.full_name}
              {...register('full_name')}
            />
            {errors.full_name ? (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              placeholder="estudiante@upao.edu"
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
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <p className="text-xs text-muted-foreground">
              {errors.password
                ? <span className="text-destructive">{errors.password.message}</span>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
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
