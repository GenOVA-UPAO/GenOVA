import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '../lib/http.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
})

export function ForgotPasswordPage() {
  const [status, setStatus] = useState('idle') // idle, submitting, success, error
  const [message, setMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }) => {
    setStatus('submitting')
    setMessage('')
    try {
      const response = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Revisa tu correo para continuar.')
      } else {
        setStatus('error')
        setMessage(data?.message || 'No se pudo solicitar la recuperación.')
      }
    } catch {
      setStatus('error')
      setMessage('No se pudo conectar con el servidor. Intenta de nuevo.')
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div className="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · Recuperación
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu acceso.
        </p>

        {status === 'success' ? (
          <div className="mt-6 space-y-4">
            <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link to="/login">Volver a iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="estudiante@genova.ai"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            {status === 'error' && message ? (
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {status === 'submitting' ? 'Enviando...' : 'Enviar enlace'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ¿Recordaste tu contraseña?{' '}
              <Link to="/login" className="font-medium text-foreground hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
