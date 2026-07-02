import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck, ShieldSlash } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/core/components/ui/alert'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { apiFetch } from '@/core/lib/http/client'
import { CopyButton } from './TotpSetupCard_parts'

const codeSchema = z.object({
  code: z.string().min(6, 'Ingresa el código de 6 dígitos.').max(8),
})

interface TotpSetupCardProps {
  totpEnabled: boolean
}

interface SetupData {
  provisioning_uri: string
  secret: string
  backup_codes?: string[]
}

interface TotpFormValues {
  code: string
}

type Phase = 'idle' | 'setup' | 'enabled'

export function TotpSetupCard({
  totpEnabled: initialEnabled,
}: TotpSetupCardProps) {
  const [phase, setPhase] = useState<Phase>(initialEnabled ? 'enabled' : 'idle')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [serverError, setServerError] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disabling, setDisabling] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TotpFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const startSetup = async () => {
    setServerError('')
    try {
      const res = await apiFetch('/auth/totp/setup', { method: 'POST' })
      const data: SetupData = await res.json()
      if (!res.ok) {
        setServerError(
          (data as { message?: string }).message ||
            'Error al iniciar la configuración.',
        )
        return
      }
      setSetupData(data)
      setBackupCodes(data.backup_codes || null)
      setPhase('setup')
    } catch {
      setServerError('No se pudo conectar con el servidor.')
    }
  }

  const confirmSetup = async ({ code }: TotpFormValues) => {
    setServerError('')
    try {
      const res = await apiFetch('/auth/totp/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      const data = (await res.json()) as { message?: string }
      if (!res.ok) {
        setServerError(data?.message || 'Código incorrecto.')
        return
      }
      reset()
      setPhase('enabled')
      setSetupData(null)
    } catch {
      setServerError('No se pudo conectar con el servidor.')
    }
  }

  const disable2fa = async () => {
    setDisableError('')
    setDisabling(true)
    try {
      const res = await apiFetch('/auth/totp', {
        method: 'DELETE',
        body: JSON.stringify({ code: disableCode.trim() }),
      })
      const data = (await res.json()) as { message?: string }
      if (!res.ok) {
        setDisableError(data?.message || 'Código incorrecto.')
        return
      }
      setPhase('idle')
      setDisableCode('')
    } catch {
      setDisableError('No se pudo conectar con el servidor.')
    } finally {
      setDisabling(false)
    }
  }

  if (phase === 'idle') {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldSlash size={18} className="text-muted-foreground" />
          <h3 className="font-semibold text-sm">
            Autenticación en 2 pasos (2FA)
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Protege tu cuenta con un código de tu aplicación autenticadora (Google
          Authenticator, Authy, etc.).
        </p>
        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        <Button size="sm" onClick={startSetup}>
          Activar 2FA
        </Button>
      </div>
    )
  }

  if (phase === 'setup' && setupData) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-accent-brand" />
          <h3 className="font-semibold text-sm">Configura tu autenticador</h3>
        </div>

        <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            Abre tu app autenticadora y escanea el código QR (o copia la clave
            manualmente).
          </li>
          <li>
            Ingresa el código de 6 dígitos que genera la app para confirmar.
          </li>
        </ol>

        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            URI de aprovisionamiento
          </p>
          <div className="flex items-center gap-1 overflow-hidden">
            <code className="text-[10px] break-all text-foreground flex-1">
              {setupData.provisioning_uri}
            </code>
            <CopyButton text={setupData.provisioning_uri} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">
            Clave secreta
          </p>
          <div className="flex items-center gap-1">
            <code className="text-xs font-mono text-foreground">
              {setupData.secret}
            </code>
            <CopyButton text={setupData.secret} />
          </div>
        </div>

        {backupCodes ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-50/10 p-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Códigos de respaldo — guárdalos ahora, no se mostrarán de nuevo
            </p>
            <div className="grid grid-cols-4 gap-1">
              {backupCodes.map((c) => (
                <code
                  key={c}
                  className="text-xs font-mono bg-muted/60 rounded px-1.5 py-0.5 text-center"
                >
                  {c}
                </code>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(confirmSetup)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de verificación</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
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
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Verificando…' : 'Confirmar y activar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPhase('idle')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (phase === 'enabled') {
    return (
      <div className="rounded-xl border border-green-500/30 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-green-500" />
          <h3 className="font-semibold text-sm">
            Autenticación en 2 pasos activada
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Tu cuenta está protegida. Para desactivar, confirma con un código de
          tu autenticador.
        </p>

        <div className="flex items-end gap-2">
          <div className="space-y-1 flex-1 max-w-[160px]">
            <Label htmlFor="disable-code" className="text-xs">
              Código actual
            </Label>
            <Input
              id="disable-code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabling || disableCode.length < 6}
            onClick={disable2fa}
          >
            {disabling ? 'Desactivando…' : 'Desactivar 2FA'}
          </Button>
        </div>
        {disableError ? (
          <Alert variant="destructive">
            <AlertDescription>{disableError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    )
  }

  return null
}
