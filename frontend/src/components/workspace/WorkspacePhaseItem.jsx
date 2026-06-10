import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PhaseVersionHistory } from './PhaseVersionHistory.jsx'

/**
 * HU-026 — Single phase resource card with drag handle + inline edit/regen/delete.
 * HU-029 — "Historial" button opens micro-version history dialog.
 * Edit: direct content PATCH. Regen: prompt-based regeneration. Delete: new version sans phase.
 */
export function WorkspacePhaseItem({
  phase, isDragging,
  dragHandleProps,
  ovaId,
  onEdit, onRegen, onDelete, onReverted,
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [mode, setMode] = useState(null) // null | 'edit' | 'regen'
  const [text, setText] = useState('')

  function openEdit() {
    setMode('edit')
    setText(phase.content || '')
  }

  function openRegen() {
    setMode('regen')
    setText('')
  }

  function cancel() {
    setMode(null)
    setText('')
  }

  async function submit() {
    if (mode === 'edit') await onEdit?.(phase.id, text)
    else await onRegen?.(phase.id, text)
    cancel()
  }

  return (
    <>
    <PhaseVersionHistory
      open={historyOpen}
      onOpenChange={setHistoryOpen}
      ovaId={ovaId}
      phaseId={phase.id}
      onReverted={onReverted}
    />
    <div
      className={`rounded-md border border-border bg-muted/30 group ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2 p-2">
        {/* drag handle */}
        <span
          className="mt-0.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground select-none cursor-grab active:cursor-grabbing"
          aria-hidden="true"
          {...dragHandleProps}
        >
          ⠿
        </span>
        <pre className="flex-1 text-xs overflow-auto max-h-28 whitespace-pre-wrap text-foreground/80">
          {phase.content || '(sin contenido)'}
        </pre>
        {/* action buttons */}
        <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button" size="sm" variant="ghost"
            className="h-5 px-1.5 text-[10px]"
            onClick={openEdit}
            title="Editar contenido"
          >
            ✏
          </Button>
          <Button
            type="button" size="sm" variant="ghost"
            className="h-5 px-1.5 text-[10px]"
            onClick={openRegen}
            title="Regenerar con prompt"
          >
            ↺
          </Button>
          <Button
            type="button" size="sm" variant="ghost"
            className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm('¿Eliminar este recurso?')) onDelete?.(phase.id)
            }}
            title="Eliminar recurso"
          >
            🗑
          </Button>
          <Button
            type="button" size="sm" variant="ghost"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => setHistoryOpen(true)}
            title="Historial micro-versiones"
          >
            ⏱
          </Button>
        </div>
      </div>

      {/* inline form */}
      {mode ? (
        <div className="border-t border-border p-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">
            {mode === 'edit' ? 'Editar contenido directamente:' : 'Prompt para regenerar:'}
          </p>
          <textarea
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'edit' ? 'Escribe el contenido…' : 'Describe el cambio que quieres…'}
          />
          <div className="flex gap-1.5">
            <Button type="button" size="sm" className="h-6 text-xs px-3" onClick={submit}>
              Guardar
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={cancel}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
    </>
  )
}
