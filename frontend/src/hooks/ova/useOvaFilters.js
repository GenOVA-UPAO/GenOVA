import { useState, useRef } from 'react'

export function useOvaFilters(onFilterChange) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const searchDebounceRef = useRef(null)

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value)
      if (onFilterChange) onFilterChange()
    }, 400)
  }

  const handleStatusChange = (e) => {
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
