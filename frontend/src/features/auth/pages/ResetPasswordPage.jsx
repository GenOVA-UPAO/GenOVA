import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/core/lib/http.js'
import { Button } from '@/core/components/ui/button'
import { PasswordInput } from '@/core/components/ui/password-input'
import { Label } from '@/core/components/ui/label'
import { Alert, AlertDescription } from '@/core/components/ui/alert'

const schema = z.object({
  new_password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
})

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('idle') // idle, submitting, success, error
  const [message, setMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onSubmit = async ({ new_password }) => {
    if (!token) {
      setStatus('error')
      setMessage('El enlace de restablecimiento es inválido o no tiene token.')
      return
    }

    setStatus('submitting')
    setMessage('')
    try {
      const response = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password }),
      })
      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Contraseña restablecida con éxito.')
      } else {
        setStatus('error')
        setMessage(data?.message || 'No se pudo restablecer la contraseña.')
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
          GenOVA · Seguridad
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresa y confirma tu nueva contraseña.
        </p>

        {status === 'success' ? (
          <div className="mt-6 space-y-4">
            <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link to="/login">Ir a iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <PasswordInput
                id="new_password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors.new_password}
                {...register('new_password')}
              />
              {errors.new_password ? (
                <p className="text-xs text-destructive">{errors.new_password.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirmar contraseña</Label>
              <PasswordInput
                id="confirm_password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors.confirm_password}
                {...register('confirm_password')}
              />
              {errors.confirm_password ? (
                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
              ) : null}
            </div>

            {status === 'error' && message ? (
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            {!token && status !== 'error' ? (
              <Alert variant="destructive">
                <AlertDescription>No se encontró el token de seguridad en la URL.</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={status === 'submitting' || !token}
            >
              {status === 'submitting' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {status === 'submitting' ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
