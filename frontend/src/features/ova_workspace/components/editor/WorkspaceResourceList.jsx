import { useRef, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { applyReorder } from '@/features/ova_workspace/lib/resourceReorder'
import { WorkspacePhaseItem } from '@/features/ova_workspace/components/editor/WorkspacePhaseItem.jsx'
import { AddResourceModal } from '@/features/ova_workspace/components/modals/AddResourceModal.jsx'

const MAX_PHASES_PER_TYPE = 4

/**
 * HU-033 — Drag-and-drop list for one phase_type group.
 * HU-026 — Edit/regen/delete actions per item via WorkspacePhaseItem.
 * Cross-phase drag is blocked by comparing stored phase_type.
 *
 * @param {Array}    phases    - OvaPhase objects for this group (sorted by phase_order)
 * @param {string}   phaseType - Label for the group header
 * @param {Function} onReorder - Called with (updatedGroupPhases) on drop
 * @param {Function} onEdit    - Called with (phaseId, content)
 * @param {Function} onRegen   - Called with (phaseId, prompt)
 * @param {Function} onDelete  - Called with (phaseId)
 */
export function WorkspaceResourceList({ phases, phaseType, onReorder, onEdit, onRegen, onDelete, ovaId, onReverted, onAdd }) {
  const dragIdxRef = useRef(null)
  const [addOpen, setAddOpen] = useState(false)
  const isFull = phases.length >= MAX_PHASES_PER_TYPE

  function handleDragStart(e, idx) {
    dragIdxRef.current = idx
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, toIdx) {
    e.preventDefault()
    const fromIdx = dragIdxRef.current
    if (fromIdx === null || fromIdx === toIdx) return

    dragIdxRef.current = null
    onReorder(applyReorder(phases, fromIdx, toIdx))
  }

  function handleDragEnd() {
    dragIdxRef.current = null
  }

  return (
    <>
    <AddResourceModal
      open={addOpen}
      onOpenChange={setAddOpen}
      phaseType={phaseType}
      currentCount={phases.length}
      onAdd={onAdd}
    />
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {phaseType}
        </p>
        <Button
          type="button" size="sm" variant="ghost"
          className="h-5 text-[10px] px-1.5 text-muted-foreground"
          disabled={isFull}
          onClick={() => setAddOpen(true)}
          title={isFull ? `Máximo ${MAX_PHASES_PER_TYPE} recursos por fase` : 'Añadir recurso'}
        >
          + Añadir
        </Button>
      </div>
      {phases.map((phase, idx) => (
        // biome-ignore lint/a11y: reordenamiento por drag&drop de fases (sin elemento nativo)
        <div
          key={phase.id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
        >
          <WorkspacePhaseItem
            phase={phase}
            isDragging={false}
            dragHandleProps={{}}
            ovaId={ovaId}
            onEdit={onEdit}
            onRegen={onRegen}
            onDelete={onDelete}
            onReverted={onReverted}
          />
        </div>
      ))}
    </div>
    </>
  )
}
