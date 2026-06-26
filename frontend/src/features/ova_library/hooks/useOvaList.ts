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
} from '../services/ovaHistoryService'
import type { OvaListItem } from '../lib/types'
import { useOvaMetadata } from './useOvaMetadata'
import { useOvaSelection } from './useOvaSelection'
import { useOvaFilters } from './useOvaFilters'

interface OvaListPage {
  ovas?: OvaListItem[]
  total_pages?: number
  total_items?: number
}

// Recalcula la página destino tras quitar N elementos: si la página actual queda
// fuera de rango, retrocede a la última con contenido.
function pageAfterRemoval(currentPage: number, totalItems: number, removed: number): number {
  const newTotalPages = Math.max(1, Math.ceil((totalItems - removed) / 10))
  return currentPage > newTotalPages ? newTotalPages : currentPage
}

export function useOvaList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [ovaToTrash, setOvaToTrash] = useState<OvaListItem | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')

  const { searchInput, search, statusFilter, handleSearchChange, handleStatusChange } =
    useOvaFilters(() => setCurrentPage(1))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ovaList', currentPage, search, statusFilter],
    queryFn: () =>
      fetchOvas({ page: currentPage, limit: 10, search, status: statusFilter }) as Promise<OvaListPage>,
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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      selection.clearSelection()
    }
  }

  const handleMoveToTrashRequest = useCallback((ova: OvaListItem) => setOvaToTrash(ova), [])
  const handleTrashCancel = () => setOvaToTrash(null)

  // F5: las acciones que mutan el servidor pasan por useMutation, con invalidación
  // estandarizada y flags de pending derivados de la mutación.
  const trashMutation = useMutation({
    mutationFn: (ovaId: string) => deleteOva(ovaId),
    onSuccess: () => {
      toast.success('OVA movido a la papelera.')
      setOvaToTrash(null)
      loadOvas(pageAfterRemoval(currentPage, totalItems, 1))
    },
    onError: (err: Error) => toast.error(err.message || 'Error al mover el OVA a la papelera.'),
  })

  const bulkTrashMutation = useMutation({
    mutationFn: (ids: string[]) => batchMoveToTrash(ids),
    onSuccess: (res) => {
      const r = res as { moved?: unknown[]; message?: string }
      const moved = r.moved?.length || 0
      toast.success(r.message || `${moved} OVAs movidos a la papelera.`)
      selection.clearSelection()
      setShowBulkModal(false)
      loadOvas(pageAfterRemoval(currentPage, totalItems, moved))
    },
    onError: (err: Error) => toast.error(err.message || 'Error al mover los OVAs.'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (ovaId: string) => duplicateOva(ovaId),
    onSuccess: (res) => {
      const r = res as { message?: string; edit_url: string }
      toast.success(r.message || 'OVA duplicado correctamente.')
      navigate(r.edit_url)
    },
    onError: (err: Error) => toast.error(err.message || 'Error al duplicar el OVA.'),
  })

  const { mutate: mutateDuplicate } = duplicateMutation
  const handleTrashConfirm = () => {
    if (ovaToTrash) trashMutation.mutate(ovaToTrash.id)
  }
  const handleBulkTrashConfirm = () => bulkTrashMutation.mutate([...selection.selectedIds])
  const handleDuplicate = useCallback((ovaId: string) => mutateDuplicate(ovaId), [mutateDuplicate])

  const movingId = trashMutation.isPending ? trashMutation.variables : ''
  const duplicatingId = duplicateMutation.isPending ? duplicateMutation.variables : ''

  const handleDownload = useCallback(async (ovaId: string, title: string) => {
    setDownloadingId(ovaId)
    try {
      await downloadOvaFile(ovaId, title)
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo descargar el archivo.')
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
    ...selection,
    ...metadata,
  }
}
