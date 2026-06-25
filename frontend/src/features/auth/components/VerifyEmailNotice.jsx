import { useState } from 'react'
import { Link } from 'react-router'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { Button } from '@/core/components/ui/button'

/**
 * Aviso "revisa tu correo" tras registro o login sin verificar.
 * `onResend` debe devolver una promesa con el mensaje (genérico) a mostrar.
 */
export function VerifyEmailNotice({ email, onResend }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [message, setMessage] = useState('')

  const handleResend = async () => {
    setStatus('sending')
    try {
      const msg = await onResend()
      setMessage(msg || 'Enlace reenviado.')
    } catch {
      setMessage('No se pudo reenviar. Intenta de nuevo en un momento.')
    } finally {
      setStatus('sent')
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <EnvelopeSimple size={24} weight="duotone" className="text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Verifica tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te enviamos un enlace de verificación a{' '}
          <span className="font-medium text-foreground break-words">{email}</span>. Ábrelo para
          activar tu cuenta.
        </p>

        <div aria-live="polite" className="mt-4 min-h-5 text-sm text-primary">
          {message}
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full"
          onClick={handleResend}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Reenviando…' : 'Reenviar enlace'}
        </Button>

        <p className="mt-5 text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </section>
  )
}
