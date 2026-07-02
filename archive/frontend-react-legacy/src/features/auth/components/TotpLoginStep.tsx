import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/core/components/ui/alert'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { apiFetch } from '@/core/lib/http/client'

const schema = z.object({
  code: z
    .string()
    .min(1, 'Ingresa el código.')
    .regex(/^[\dA-Fa-f\s]{4,8}$/, 'Código inválido.'),
})

interface TotpLoginStepProps {
  ticket: string
  onSuccess: () => void
  onCancel: () => void
}

interface TotpFormValues {
  code: string
}

export function TotpLoginStep({
  ticket,
  onSuccess,
  onCancel,
}: TotpLoginStepProps) {
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  })

  const onSubmit = async ({ code }: TotpFormValues) => {
    setServerError('')
    try {
      const response = await apiFetch('/auth/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ ticket, code: code.trim() }),
      })
      const data = await response.json()
      if (response.ok) {
        onSuccess()
        return
      }
      setServerError(data?.message || 'Código incorrecto.')
    } catch {
      setServerError('No se pudo conectar con el servidor.')
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div className="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          Verificación en 2 pasos
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Código de autenticación
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Abre tu aplicación autenticadora e ingresa el código de 6 dígitos.
          También puedes usar un código de respaldo.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={8}
              aria-invalid={!!errors.code}
              {...register('code')}
            />
            {errors.code ? (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            ) : null}
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
            {isSubmitting ? 'Verificando…' : 'Verificar'}
          </Button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Volver al inicio de sesión
          </button>
        </form>
      </div>
    </section>
  )
}
