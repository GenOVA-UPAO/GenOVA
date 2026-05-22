import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  batchMoveToTrash,
  deleteOva,
  downloadOvaFile,
  duplicateOva,
  fetchOvas,
} from '../services/ovaHistoryService.js'
import { useOvaMetadata } from './useOvaMetadata.js'

export function useOvaList() {
  const navigate = useNavigate()
  const [ovas, setOvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [ovaToTrash, setOvaToTrash] = useState(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [movingId, setMovingId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')
  const [duplicatingId, setDuplicatingId] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())

  const searchDebounceRef = useRef(null)

  const {
    metadataModalOpen,
    metadataForm,
    metadataError,
    metadataSaving,
    openMetadataModal,
    closeMetadataModal,
    handleMetadataChange,
    handleMetadataSave,
  } = useOvaMetadata(setOvas)

  const loadOvas = useCallback(
    async (page = 1, searchTerm = search, statusTerm = statusFilter) => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchOvas({ page, limit: 10, search: searchTerm, status: statusTerm })
        setOvas(data.ovas || [])
        setTotalPages(data.total_pages || 1)
        setCurrentPage(data.page || 1)
        setTotalItems(data.total_items || 0)
      } catch {
        setError('No se pudo cargar el historial de OVAs.')
      } finally {
        setLoading(false)
      }
    },
    [search, statusFilter]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga el listado al cambiar filtros
    loadOvas(1, search, statusFilter)
    setSelectedIds(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value)
      setCurrentPage(1)
    }, 400)
  }

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadOvas(newPage, search, statusFilter)
      setSelectedIds(new Set())
    }
  }

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectableIds = ovas.filter((o) => o.status !== 'generando').map((o) => o.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableIds))
    }
  }

  const handleMoveToTrashRequest = (ova) => setOvaToTrash(ova)
  const handleTrashCancel = () => setOvaToTrash(null)

  const handleTrashConfirm = async () => {
    if (!ovaToTrash) return
    setMovingId(ovaToTrash.id)
    try {
      await deleteOva(ovaToTrash.id)
      toast.success('OVA movido a la papelera.')
      setOvaToTrash(null)
      const newTotal = totalItems - 1
      const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
      const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
      loadOvas(targetPage, search, statusFilter)
    } catch (err) {
      toast.error(err.message || 'Error al mover el OVA a la papelera.')
    } finally {
      setMovingId('')
    }
  }

  const handleBulkTrashConfirm = async () => {
    setBulkLoading(true)
    try {
      const res = await batchMoveToTrash([...selectedIds])
      toast.success(res.message || `${res.moved?.length} OVAs movidos a la papelera.`)
      setSelectedIds(new Set())
      setShowBulkModal(false)
      const newTotal = totalItems - (res.moved?.length || 0)
      const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
      const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
      loadOvas(targetPage, search, statusFilter)
    } catch (err) {
      toast.error(err.message || 'Error al mover los OVAs.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDuplicate = async (ovaId) => {
    setDuplicatingId(ovaId)
    try {
      const res = await duplicateOva(ovaId)
      toast.success(res.message || 'OVA duplicado correctamente.')
      navigate(res.edit_url)
    } catch (err) {
      toast.error(err.message || 'Error al duplicar el OVA.')
    } finally {
      setDuplicatingId('')
    }
  }

  const handleDownload = async (ovaId, title) => {
    setDownloadingId(ovaId)
    try {
      await downloadOvaFile(ovaId, title)
    } catch (err) {
      toast.error(err.message || 'No se pudo descargar el archivo.')
    } finally {
      setDownloadingId('')
    }
  }

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
    bulkLoading,
    downloadingId,
    duplicatingId,
    selectedIds,
    metadataModalOpen,
    metadataForm,
    metadataError,
    metadataSaving,
    allSelected,
    isEmpty,
    loadOvas,
    handleSearchChange,
    handleStatusChange,
    handlePageChange,
    handleToggleSelect,
    handleSelectAll,
    handleMoveToTrashRequest,
    handleTrashCancel,
    handleTrashConfirm,
    handleBulkTrashConfirm,
    handleDuplicate,
    openMetadataModal,
    closeMetadataModal,
    handleMetadataChange,
    handleMetadataSave,
    handleDownload,
    setSelectedIds,
    setShowBulkModal,
  }
}
