import { useRef, useState } from 'react'

interface ValueEvent {
  target: { value: string }
}

export function useOvaFilters(onFilterChange?: () => void) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (e: ValueEvent) => {
    const value = e.target.value
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value)
      if (onFilterChange) onFilterChange()
    }, 400)
  }

  const handleStatusChange = (e: ValueEvent) => {
    setStatusFilter(e.target.value)
    if (onFilterChange) onFilterChange()
  }

  return {
    searchInput,
    search,
    statusFilter,
    handleSearchChange,
    handleStatusChange,
    setSearch,
    setStatusFilter,
  }
}
