import { useRef, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { WorkspacePhaseItem } from '@/features/ova_workspace/components/editor/WorkspacePhaseItem'
import { AddResourceModal } from '@/features/ova_workspace/components/modals/AddResourceModal'
import { applyReorder } from '@/features/ova_workspace/lib/resourceReorder'
import type { PhaseWithContent } from '@/features/ova_workspace/lib/types'

const MAX_PHASES_PER_TYPE = 4

interface WorkspaceResourceListProps {
  phases: PhaseWithContent[]
  phaseType: string
  onReorder: (updatedPhases: PhaseWithContent[]) => void
  onEdit: (phaseId: string, content: string) => void
  onRegen: (phaseId: string, prompt?: string) => void
  onDelete: (phaseId: string) => void
  ovaId: string
  onReverted: () => void
  onAdd: (phaseType: string, prompt: string) => void
}

export function WorkspaceResourceList({
  phases,
  phaseType,
  onReorder,
  onEdit,
  onRegen,
  onDelete,
  ovaId,
  onReverted,
  onAdd,
}: WorkspaceResourceListProps) {
  const dragIdxRef = useRef<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const isFull = phases.length >= MAX_PHASES_PER_TYPE

  function handleDragStart(e: React.DragEvent, idx: number) {
    dragIdxRef.current = idx
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, toIdx: number) {
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
            type="button"
            size="sm"
            variant="ghost"
            className="h-5 text-[10px] px-1.5 text-muted-foreground"
            disabled={isFull}
            onClick={() => setAddOpen(true)}
            title={
              isFull
                ? `Máximo ${MAX_PHASES_PER_TYPE} recursos por fase`
                : 'Añadir recurso'
            }
          >
            + Añadir
          </Button>
        </div>
        {phases.map((phase, idx) => (
          // biome-ignore lint/a11y: ítem de reordenamiento drag&drop; el orden también es editable por los controles del recurso
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
