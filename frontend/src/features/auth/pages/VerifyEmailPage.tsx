import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/core/components/ui/button'
import { markLoggedIn } from '@/features/auth/services/auth'
import { verifyEmail } from '@/features/auth/services/verification'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) {
      setStatus('error')
      setMessage('Enlace de verificación inválido.')
      return
    }
    verifyEmail(token)
      .then(() => {
        markLoggedIn()
        setStatus('success')
      })
      .catch((e: Error) => {
        setStatus('error')
        setMessage(e.message)
      })
  }, [token])

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        {status === 'verifying' && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">
              Verificando tu correo…
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle
                size={26}
                weight="duotone"
                className="text-primary"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              ¡Correo verificado!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu cuenta ya está activa.
            </p>
            <Button
              type="button"
              className="mt-5 w-full"
              onClick={() => navigate('/dashboard')}
            >
              Ir al dashboard
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <WarningCircle
                size={26}
                weight="duotone"
                className="text-destructive"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              No se pudo verificar
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <p className="mt-5 text-sm text-muted-foreground">
              <Link
                to="/login"
                className="font-medium text-foreground hover:underline"
              >
                Volver a iniciar sesión
              </Link>{' '}
              para solicitar un nuevo enlace.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
