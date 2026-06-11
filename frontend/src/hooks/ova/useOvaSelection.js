import { useCallback, useState } from 'react'

export function useOvaSelection(ovas) {
  const [selectedIds, setSelectedIds] = useState(new Set())

  const selectableIds = ovas.filter((o) => o.status !== 'generando').map((o) => o.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id))

  // Stable identity (functional setState) so memoized OvaCard isn't re-rendered
  // just because the parent re-rendered (Vercel: rerender-functional-setstate).
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableIds))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  return {
    selectedIds,
    setSelectedIds,
    allSelected,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
  }
}
