import { useState } from 'react'
import { toast } from 'sonner'
import {
  batchPermanentDelete,
  batchRestore,
  permanentDeleteOva,
  restoreOva,
} from '../services/ovaHistoryService'
import type { OvaListItem } from '../lib/types'

export interface ConfirmModal {
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  onConfirm: () => void
}

interface BulkResult {
  message?: string
  restored?: unknown[]
  deleted?: unknown[]
}

function nextPageAfterDrop(currentPage: number, totalItems: number, dropped: number): number {
  const newTotalPages = Math.max(1, Math.ceil((totalItems - dropped) / 10))
  return currentPage > newTotalPages ? newTotalPages : currentPage
}

// Acciones de papelera (restaurar / borrar definitivo, individuales y en lote)
// con su modal de confirmación. Separadas de useTrashList para acotar tamaño.
export function useTrashActions(
  currentPage: number,
  totalItems: number,
  selectedIds: Set<string>,
  loadTrash: (page?: number) => void,
  clearSelection: () => void,
) {
  const [restoringId, setRestoringId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)

  const runSingleAction = async (
    action: (id: string) => Promise<unknown>,
    ovaId: string,
    successMsg: string,
    errorPrefix: string,
    setIdState: (s: string) => void,
  ) => {
    setIdState(ovaId)
    setConfirmModal(null)
    try {
      await action(ovaId)
      toast.success(successMsg)
      loadTrash(nextPageAfterDrop(currentPage, totalItems, 1))
    } catch (err) {
      toast.error((err as Error).message || errorPrefix)
    } finally {
      setIdState('')
    }
  }

  const runBulkAction = async (
    action: (ids: string[]) => Promise<unknown>,
    successMsgFn: (res: BulkResult) => string,
    errorMsg: string,
    countKey: 'restored' | 'deleted',
  ) => {
    setBulkLoading(true)
    setConfirmModal(null)
    try {
      const res = (await action([...selectedIds])) as BulkResult
      toast.success(successMsgFn(res))
      clearSelection()
      loadTrash(nextPageAfterDrop(currentPage, totalItems, res[countKey]?.length || 0))
    } catch (err) {
      toast.error((err as Error).message || errorMsg)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleRestore = (ovaId: string) => {
    setConfirmModal({
      title: 'Restaurar OVA',
      message: '¿Restaurar este OVA al historial activo?',
      confirmLabel: 'Restaurar',
      danger: false,
      onConfirm: () =>
        runSingleAction(
          restoreOva,
          ovaId,
          'OVA restaurado correctamente.',
          'Error al restaurar el OVA.',
          setRestoringId,
        ),
    })
  }

  const handlePermanentDelete = (ova: OvaListItem) => {
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente "${ova.title}"?\n\nEsta acción eliminará el OVA y su paquete SCORM del servidor. No se puede deshacer.`,
      confirmLabel: 'Borrar',
      danger: true,
      onConfirm: () =>
        runSingleAction(
          permanentDeleteOva,
          ova.id,
          'OVA eliminado permanentemente.',
          'Error al eliminar el OVA.',
          setDeletingId,
        ),
    })
  }

  const handleBulkRestore = () => {
    const count = selectedIds.size
    setConfirmModal({
      title: 'Restaurar OVAs',
      message: `¿Restaurar ${count} OVA${count > 1 ? 's' : ''} al historial activo?`,
      confirmLabel: `Restaurar ${count}`,
      danger: false,
      onConfirm: () =>
        runBulkAction(
          batchRestore,
          (res) => res.message || `${res.restored?.length} OVAs restaurados.`,
          'Error al restaurar los OVAs.',
          'restored',
        ),
    })
  }

  const handleBulkPermanentDelete = () => {
    const count = selectedIds.size
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente ${count} OVA${count > 1 ? 's' : ''}?\n\nEsta acción eliminará los OVAs y sus paquetes SCORM del servidor. No se puede deshacer.`,
      confirmLabel: `Borrar ${count}`,
      danger: true,
      onConfirm: () =>
        runBulkAction(
          batchPermanentDelete,
          (res) => res.message || `${res.deleted?.length} OVAs eliminados permanentemente.`,
          'Error al eliminar los OVAs.',
          'deleted',
        ),
    })
  }

  return {
    restoringId,
    deletingId,
    bulkLoading,
    confirmModal,
    setConfirmModal,
    handleRestore,
    handlePermanentDelete,
    handleBulkRestore,
    handleBulkPermanentDelete,
  }
}
