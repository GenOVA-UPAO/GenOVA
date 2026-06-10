import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const MAX_PHASES_PER_TYPE = 4

/**
 * HU-032 — Modal para añadir un nuevo recurso a una fase del OVA.
 * Validates max 4 per phase_type. Submit triggers addOvaPhase callback.
 */
export function AddResourceModal({ open, onOpenChange, phaseType, currentCount, onAdd }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const isFull = currentCount >= MAX_PHASES_PER_TYPE

  async function handleSubmit() {
    if (!prompt.trim() || loading || isFull) return
    setLoading(true)
    try {
      await onAdd?.(phaseType, prompt.trim())
      setPrompt('')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir recurso — {phaseType}</DialogTitle>
          <DialogDescription>
            {isFull
              ? `Esta fase ya tiene el máximo de ${MAX_PHASES_PER_TYPE} recursos.`
              : `Describe el nuevo recurso para la fase "${phaseType}" (${currentCount}/${MAX_PHASES_PER_TYPE}).`}
          </DialogDescription>
        </DialogHeader>

        {!isFull ? (
          <div className="space-y-3 py-1">
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={`Ej: "Añade un ejemplo práctico de ${phaseType} con código Python"`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleSubmit()
              }}
            />
            <p className="text-[10px] text-muted-foreground">Ctrl+Enter para guardar</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!isFull ? (
            <Button
              type="button"
              disabled={!prompt.trim() || loading}
              onClick={handleSubmit}
            >
              {loading ? 'Añadiendo…' : 'Añadir recurso'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
