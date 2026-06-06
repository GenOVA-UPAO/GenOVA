import { useState } from 'react'
import { toast } from 'sonner'
import { HtmlCodePreview } from './HtmlCodePreview.jsx'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const PHASE_LABELS = {
  motivacion: 'Motivación',
  contenido: 'Contenido',
  explicacion: 'Explicación',
  actividad: 'Actividad',
  evaluacion: 'Evaluación',
}

export function PhaseCard({
  phase,
  checked,
  onCheckToggle,
  onRegenSingle,
  onSave,
  isRegenerating,
  regenProgress,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(phase.content)
  const [saving, setSaving] = useState(false)
  const label = PHASE_LABELS[phase.phase_type] || phase.phase_type

  const handleSave = async () => {
    if (!draft.trim()) {
      toast.error('El contenido no puede estar vacío.')
      return
    }
    setSaving(true)
    try {
      await onSave(phase.id, draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = isRegenerating && regenProgress?.regenningPhases?.includes(phase.id)

  return (
    <div className={`rounded-xl border bg-background p-5 shadow-sm transition-all ${checked ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}>
      <div className="flex items-center gap-3 mb-3">
        <Checkbox
          checked={checked}
          onCheckedChange={() => onCheckToggle(phase.id)}
          disabled={isRegenerating}
        />
        <span className="text-sm font-semibold">
          {phase.phase_order}. {label}
        </span>
        {phase.regenerated ? (
          <span className="rounded-full bg-primary/5 border border-primary/20 px-2 py-0.5 text-xs text-primary font-medium">
            IA
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <span className="text-xs text-muted-foreground">Regenerando fase...</span>
        </div>
      ) : editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Editor</p>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Vista previa</p>
              <div className="min-h-[120px]">
                {draft ? (
                  <HtmlCodePreview htmlContent={draft} defaultView="preview" height="300px" />
                ) : (
                  <span className="text-sm text-muted-foreground italic">Sin contenido</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar fase'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <HtmlCodePreview htmlContent={phase.content} defaultView="preview" height="400px" />
        </div>
      )}

      {!editing && !isLoading ? (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDraft(phase.content); setEditing(true) }}
            disabled={isRegenerating}
          >
            ✏ Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenSingle(phase.id, label)}
            disabled={isRegenerating}
            className="text-primary border-primary/30 hover:bg-primary/5"
          >
            ↺ Regenerar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
