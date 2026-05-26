import { useState } from 'react'

const PHASE_LABELS = {
  motivacion: 'Motivación',
  contenido: 'Contenido',
  explicacion: 'Explicación',
  actividad: 'Actividad',
  evaluacion: 'Evaluación',
}

export function useRegenConfirmModal({
  prompt,
  phases,
  currentVersionNum,
  ovaData,
  executeRegen,
  checkedPhases,
}) {
  const [confirmModal, setConfirmModal] = useState(null)

  const handleRegenSingle = (phaseId, label) => {
    setConfirmModal({
      title: 'Regenerar fase',
      message: `¿Regenerar la fase "${label}"?\n\nEl contenido actual quedará archivado en la versión ${currentVersionNum}.`,
      onConfirm: () => {
        setConfirmModal(null)
        executeRegen(prompt, [phaseId])
      },
    })
  }

  const handleRegenSelected = () => {
    const selectedLabels = phases
      .filter((p) => checkedPhases.has(p.id))
      .map((p) => PHASE_LABELS[p.phase_type] || p.phase_type)
      .join(', ')

    setConfirmModal({
      title: 'Regenerar fases seleccionadas',
      message: `Se regenerarán las fases:\n• ${selectedLabels}\n\nEsto creará la versión v${(currentVersionNum || 0) + 1}. Las demás fases no se modificarán.`,
      onConfirm: () => {
        setConfirmModal(null)
        executeRegen(prompt, [...checkedPhases])
      },
    })
  }

  const handleRegenFull = () => {
    setConfirmModal({
      title: 'Regenerar OVA completo',
      message: `Se regenerarán TODAS las fases usando ${
        prompt !== ovaData?.current_version?.prompt ? 'el nuevo prompt' : 'el prompt actual'
      }.\n\nEsto creará la versión v${(currentVersionNum || 0) + 1}. El contenido actual quedará archivado.`,
      onConfirm: () => {
        setConfirmModal(null)
        executeRegen(prompt, [])
      },
    })
  }

  return {
    confirmModal,
    setConfirmModal,
    handleRegenSingle,
    handleRegenSelected,
    handleRegenFull,
  }
}
