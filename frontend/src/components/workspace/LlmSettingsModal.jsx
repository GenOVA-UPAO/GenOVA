import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useLlmSettings } from '../../hooks/useLlmSettings.js'
import { LlmSettingsForm } from '../settings/LlmSettingsForm.jsx'

/**
 * Shortcut modal for the per-user LLM config, opened from the OVAs/workspace area
 * so the user doesn't have to go to Mi Perfil. Same config + same hook as the
 * profile section. Loads when opened.
 */
export function LlmSettingsModal({ open, onOpenChange }) {
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
            <Link to="/profile" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
              Mi Perfil
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <LlmSettingsForm hook={hook} readOnly={!hasOwnLlmKey} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={hook.saving}>
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
