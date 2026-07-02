import { Link } from 'react-router'
import { LlmSettingsForm } from '@/core/settings/components/LlmSettingsForm'
import { Button } from '@/core/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'
import { useLlmSettings } from '@/core/settings/hooks/useLlmSettings'

interface LlmSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LlmSettingsModal({
  open,
  onOpenChange,
}: LlmSettingsModalProps) {
  const hook = useLlmSettings(open)
  const { hasOwnLlmKey } = hook

  async function handleSave() {
    const ok = await hook.save()
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuración de IA</DialogTitle>
          <DialogDescription>
            Modelos y tiempos de espera para generar OVAs. También editable en{' '}
            <Link
              to="/profile"
              className="text-primary hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Mi Perfil
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <LlmSettingsForm hook={hook} readOnly={!hasOwnLlmKey} />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={hook.saving}
          >
            {hasOwnLlmKey ? 'Cancelar' : 'Cerrar'}
          </Button>
          {hasOwnLlmKey && (
            <Button onClick={handleSave} disabled={hook.saving || hook.loading}>
              {hook.saving ? 'Guardando…' : 'Guardar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
