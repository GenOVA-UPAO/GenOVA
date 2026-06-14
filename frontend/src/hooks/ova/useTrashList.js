import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  batchPermanentDelete,
  batchRestore,
  fetchTrashedOvas,
  permanentDeleteOva,
  restoreOva,
} from '../../services/ovaHistoryService.js'

function nextPageAfterDrop(currentPage, totalItems, dropped) {
  const newTotal = totalItems - dropped
  const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
  return currentPage > newTotalPages ? newTotalPages : currentPage
}

export function useTrashList() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [restoringId, setRestoringId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trashList', currentPage],
    queryFn: () => fetchTrashedOvas({ page: currentPage, limit: 10 }),
  })

  const ovas = data?.ovas || []
  const totalPages = data?.total_pages || 1
  const totalItems = data?.total_items || 0
  const error = isError ? 'No se pudo cargar la papelera.' : ''

  const loadTrash = useCallback(
    (page = 1) => {
      setCurrentPage(page)
      qc.invalidateQueries({ queryKey: ['trashList'] })
      qc.invalidateQueries({ queryKey: ['ovaList'] })
    },
    [qc],
  )

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = ovas.length > 0 && ovas.every((o) => selectedIds.has(o.id))

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(ovas.map((o) => o.id)))
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      setSelectedIds(new Set())
    }
  }

  const runSingleAction = async (action, ovaId, successMsg, errorPrefix, setIdState) => {
    setIdState(ovaId)
    setConfirmModal(null)
    try {
      await action(ovaId)
      toast.success(successMsg)
      loadTrash(nextPageAfterDrop(currentPage, totalItems, 1))
    } catch (err) {
      toast.error(err.message || errorPrefix)
    } finally {
      setIdState('')
    }
  }

  const runBulkAction = async (action, successMsgFn, errorMsg, countKey) => {
    setBulkLoading(true)
    setConfirmModal(null)
    try {
      const res = await action([...selectedIds])
      toast.success(successMsgFn(res))
      setSelectedIds(new Set())
      loadTrash(nextPageAfterDrop(currentPage, totalItems, res[countKey]?.length || 0))
    } catch (err) {
      toast.error(err.message || errorMsg)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleRestore = (ovaId) => {
    setConfirmModal({
      title: 'Restaurar OVA',
      message: '¿Restaurar este OVA al historial activo?',
      confirmLabel: 'Restaurar',
      danger: false,
      onConfirm: () =>
        runSingleAction(restoreOva, ovaId, 'OVA restaurado correctamente.', 'Error al restaurar el OVA.', setRestoringId),
    })
  }

  const handlePermanentDelete = (ova) => {
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente "${ova.title}"?\n\nEsta acción eliminará el OVA y su paquete SCORM del servidor. No se puede deshacer.`,
      confirmLabel: 'Borrar',
      danger: true,
      onConfirm: () =>
        runSingleAction(permanentDeleteOva, ova.id, 'OVA eliminado permanentemente.', 'Error al eliminar el OVA.', setDeletingId),
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
          'restored'
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
          'deleted'
        ),
    })
  }

  const isEmpty = !isLoading && !isError && ovas.length === 0

  return {
    ovas,
    loading: isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    selectedIds,
    restoringId,
    deletingId,
    bulkLoading,
    confirmModal,
    allSelected,
    isEmpty,
    handleToggleSelect,
    handleSelectAll,
    handlePageChange,
    handleRestore,
    handlePermanentDelete,
    handleBulkRestore,
    handleBulkPermanentDelete,
    setConfirmModal,
    loadTrash,
  }
}
