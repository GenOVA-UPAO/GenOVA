import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '../lib/http.js'
import { clearSession } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { WarningCircle } from '@phosphor-icons/react'

const schema = z.object({
  password: z.string().min(1, 'La contraseña es requerida para confirmar'),
})

export function DeleteAccountForm() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  })

  const onSubmit = async ({ password }) => {
    setServerError('')
    try {
      const response = await apiFetch('/users/me', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      })
      
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setOpen(false)
        await clearSession()
        navigate('/login')
      } else {
        setServerError(data?.detail || data?.message || 'No se pudo eliminar la cuenta.')
      }
    } catch {
      setServerError('No se pudo conectar con el servidor.')
    }
  }

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset()
      setServerError('')
    }
  }

  return (
    <div className="glass-card rounded-3xl border-destructive/20 bg-destructive/5 p-6 sm:p-8">
      <div className="flex flex-col gap-2 mb-4 text-destructive">
        <h2 className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
          <WarningCircle size={22} weight="fill" /> Zona de peligro
        </h2>
        <p className="text-sm font-medium text-muted-foreground/80">
          Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro.
        </p>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="destructive">Eliminar cuenta</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Estás completamente seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Esto desactivará tu cuenta y anonimizará tus datos personales. Tus OVAs generados se mantendrán en el sistema pero perderán tu autoría.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="delete-password">Contraseña actual</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Ingresa tu contraseña para confirmar"
                autoComplete="current-password"
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? 'Eliminando...' : 'Sí, eliminar cuenta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
