import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTrashedOvas } from '../services/ovaHistoryService'
import type { OvaListItem } from '../lib/types'
import { useTrashActions } from './useTrashActions'

interface TrashPage {
  ovas?: OvaListItem[]
  total_pages?: number
  total_items?: number
}

export function useTrashList() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trashList', currentPage],
    queryFn: () => fetchTrashedOvas({ page: currentPage, limit: 10 }) as Promise<TrashPage>,
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

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = ovas.length > 0 && ovas.every((o) => selectedIds.has(o.id))

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(ovas.map((o) => o.id)))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      clearSelection()
    }
  }

  const actions = useTrashActions(currentPage, totalItems, selectedIds, loadTrash, clearSelection)

  const isEmpty = !isLoading && !isError && ovas.length === 0

  return {
    ovas,
    loading: isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    selectedIds,
    allSelected,
    isEmpty,
    handleToggleSelect,
    handleSelectAll,
    handlePageChange,
    loadTrash,
    ...actions,
  }
}
