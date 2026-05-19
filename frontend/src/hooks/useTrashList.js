import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  batchPermanentDelete,
  batchRestore,
  fetchTrashedOvas,
  permanentDeleteOva,
  restoreOva,
} from '../services/ovaHistoryService.js'

export function useTrashList() {
  const [ovas, setOvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [restoringId, setRestoringId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)

  const loadTrash = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchTrashedOvas({ page, limit: 10 })
      setOvas(data.ovas || [])
      setTotalPages(data.total_pages || 1)
      setCurrentPage(data.page || 1)
      setTotalItems(data.total_items || 0)
    } catch {
      setError('No se pudo cargar la papelera.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrash(1)
  }, [loadTrash])

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = ovas.length > 0 && ovas.every((o) => selectedIds.has(o.id))

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(ovas.map((o) => o.id)))
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadTrash(newPage)
      setSelectedIds(new Set())
    }
  }

  const handleRestore = (ovaId) => {
    setConfirmModal({
      title: 'Restaurar OVA',
      message: '¿Restaurar este OVA al historial activo?',
      confirmLabel: 'Restaurar',
      danger: false,
      onConfirm: async () => {
        setRestoringId(ovaId)
        setConfirmModal(null)
        try {
          await restoreOva(ovaId)
          toast.success('OVA restaurado correctamente.')
          const newTotal = totalItems - 1
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al restaurar el OVA.')
        } finally {
          setRestoringId('')
        }
      },
    })
  }

  const handlePermanentDelete = (ova) => {
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente "${ova.title}"?\n\nEsta acción eliminará el OVA y su paquete SCORM del servidor. No se puede deshacer.`,
      confirmLabel: 'Borrar',
      danger: true,
      onConfirm: async () => {
        setDeletingId(ova.id)
        setConfirmModal(null)
        try {
          await permanentDeleteOva(ova.id)
          toast.success('OVA eliminado permanentemente.')
          const newTotal = totalItems - 1
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al eliminar el OVA.')
        } finally {
          setDeletingId('')
        }
      },
    })
  }

  const handleBulkRestore = () => {
    const count = selectedIds.size
    setConfirmModal({
      title: 'Restaurar OVAs',
      message: `¿Restaurar ${count} OVA${count > 1 ? 's' : ''} al historial activo?`,
      confirmLabel: `Restaurar ${count}`,
      danger: false,
      onConfirm: async () => {
        setBulkLoading(true)
        setConfirmModal(null)
        try {
          const res = await batchRestore([...selectedIds])
          toast.success(res.message || `${res.restored?.length} OVAs restaurados.`)
          setSelectedIds(new Set())
          const newTotal = totalItems - (res.restored?.length || 0)
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al restaurar los OVAs.')
        } finally {
          setBulkLoading(false)
        }
      },
    })
  }

  const handleBulkPermanentDelete = () => {
    const count = selectedIds.size
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente ${count} OVA${count > 1 ? 's' : ''}?\n\nEsta acción eliminará los OVAs y sus paquetes SCORM del servidor. No se puede deshacer.`,
      confirmLabel: `Borrar ${count}`,
      danger: true,
      onConfirm: async () => {
        setBulkLoading(true)
        setConfirmModal(null)
        try {
          const res = await batchPermanentDelete([...selectedIds])
          toast.success(res.message || `${res.deleted?.length} OVAs eliminados permanentemente.`)
          setSelectedIds(new Set())
          const newTotal = totalItems - (res.deleted?.length || 0)
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al eliminar los OVAs.')
        } finally {
          setBulkLoading(false)
        }
      },
    })
  }

  const isEmpty = !loading && !error && ovas.length === 0

  return {
    ovas,
    loading,
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
