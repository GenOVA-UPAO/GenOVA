import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  batchMoveToTrash,
  deleteOva,
  downloadOvaFile,
  duplicateOva,
  fetchOvas,
} from '../../ova_library/services/ovaHistoryService'
import { useOvaMetadata } from './useOvaMetadata.js'
import { useOvaSelection } from './useOvaSelection.js'
import { useOvaFilters } from './useOvaFilters.js'

// Recalcula la página destino tras quitar N elementos: si la página actual queda
// fuera de rango, retrocede a la última con contenido.
function pageAfterRemoval(currentPage, totalItems, removed) {
  const newTotalPages = Math.max(1, Math.ceil((totalItems - removed) / 10))
  return currentPage > newTotalPages ? newTotalPages : currentPage
}

export function useOvaList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)

  const [ovaToTrash, setOvaToTrash] = useState(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')

  const {
    searchInput,
    search,
    statusFilter,
    handleSearchChange,
    handleStatusChange,
  } = useOvaFilters(() => setCurrentPage(1))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ovaList', currentPage, search, statusFilter],
    queryFn: () =>
      fetchOvas({ page: currentPage, limit: 10, search, status: statusFilter }),
  })
  const ovas = data?.ovas || []
  const totalPages = data?.total_pages || 1
  const totalItems = data?.total_items || 0
  const loading = isLoading
  const error = isError ? 'No se pudo cargar el historial de OVAs.' : ''

  const invalidateList = useCallback(
    () => qc.invalidateQueries({ queryKey: ['ovaList'] }),
    [qc],
  )

  const loadOvas = useCallback(
    (page = currentPage) => {
      setCurrentPage(page)
      invalidateList()
    },
    [currentPage, invalidateList],
  )

  const selection = useOvaSelection(ovas)
  const metadata = useOvaMetadata(invalidateList)

  useEffect(() => {
    selection.clearSelection()
  }, [search, statusFilter])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      selection.clearSelection()
    }
  }

  // Stable identities for props handed to the memoized OvaCard.
  const handleMoveToTrashRequest = useCallback((ova) => setOvaToTrash(ova), [])
  const handleTrashCancel = () => setOvaToTrash(null)

  // F5: las tres acciones que mutan el servidor pasan por useMutation, así el
  // estado pending y la invalidación de la lista quedan estandarizados (los flags
  // movingId/bulkLoading/duplicatingId se derivan de la mutación, no de useState).
  const trashMutation = useMutation({
    mutationFn: (ovaId) => deleteOva(ovaId),
    onSuccess: () => {
      toast.success('OVA movido a la papelera.')
      setOvaToTrash(null)
      loadOvas(pageAfterRemoval(currentPage, totalItems, 1))
    },
    onError: (err) =>
      toast.error(err.message || 'Error al mover el OVA a la papelera.'),
  })

  const bulkTrashMutation = useMutation({
    mutationFn: (ids) => batchMoveToTrash(ids),
    onSuccess: (res) => {
      const moved = res.moved?.length || 0
      toast.success(res.message || `${moved} OVAs movidos a la papelera.`)
      selection.clearSelection()
      setShowBulkModal(false)
      loadOvas(pageAfterRemoval(currentPage, totalItems, moved))
    },
    onError: (err) => toast.error(err.message || 'Error al mover los OVAs.'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (ovaId) => duplicateOva(ovaId),
    onSuccess: (res) => {
      toast.success(res.message || 'OVA duplicado correctamente.')
      navigate(res.edit_url)
    },
    onError: (err) => toast.error(err.message || 'Error al duplicar el OVA.'),
  })

  // `.mutate` es estable entre renders; derivarlo mantiene handleDuplicate con
  // identidad estable para no romper el memo de OvaCard.
  const { mutate: mutateDuplicate } = duplicateMutation
  const handleTrashConfirm = () => {
    if (ovaToTrash) trashMutation.mutate(ovaToTrash.id)
  }
  const handleBulkTrashConfirm = () =>
    bulkTrashMutation.mutate([...selection.selectedIds])
  const handleDuplicate = useCallback(
    (ovaId) => mutateDuplicate(ovaId),
    [mutateDuplicate],
  )

  const movingId = trashMutation.isPending ? trashMutation.variables : ''
  const duplicatingId = duplicateMutation.isPending
    ? duplicateMutation.variables
    : ''

  const handleDownload = useCallback(async (ovaId, title) => {
    setDownloadingId(ovaId)
    try {
      await downloadOvaFile(ovaId, title)
    } catch (err) {
      toast.error(err.message || 'No se pudo descargar el archivo.')
    } finally {
      setDownloadingId('')
    }
  }, [])

  const isEmpty = !loading && !error && ovas.length === 0

  return {
    ovas,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    searchInput,
    statusFilter,
    ovaToTrash,
    showBulkModal,
    movingId,
    bulkLoading: bulkTrashMutation.isPending,
    downloadingId,
    duplicatingId,
    isEmpty,
    loadOvas,
    handleSearchChange,
    handleStatusChange,
    handlePageChange,
    handleMoveToTrashRequest,
    handleTrashCancel,
    handleTrashConfirm,
    handleBulkTrashConfirm,
    handleDuplicate,
    handleDownload,
    setShowBulkModal,
    // selection
    selectedIds: selection.selectedIds,
    setSelectedIds: selection.setSelectedIds,
    allSelected: selection.allSelected,
    handleToggleSelect: selection.handleToggleSelect,
    handleSelectAll: selection.handleSelectAll,
    // metadata
    metadataModalOpen: metadata.metadataModalOpen,
    metadataInitial: metadata.metadataInitial,
    metadataSaving: metadata.metadataSaving,
    openMetadataModal: metadata.openMetadataModal,
    closeMetadataModal: metadata.closeMetadataModal,
    saveMetadata: metadata.saveMetadata,
  }
}
