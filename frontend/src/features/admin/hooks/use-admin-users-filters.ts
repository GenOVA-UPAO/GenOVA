import { useState } from "react";

import { ALL_ROLE_FILTER } from "../lib/types";
import { useDebounce } from "./use-debounce";

export function useAdminUsersFilters() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_ROLE_FILTER);
  const debouncedSearch = useDebounce(search, 300);

  return {
    page,
    search,
    roleFilter,
    debouncedSearch,
    setPage,
    onSearchChange: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    onRoleFilterChange: (value: string) => {
      setRoleFilter(value);
      setPage(1);
    },
    onClearFilters: () => {
      setSearch("");
      setRoleFilter(ALL_ROLE_FILTER);
      setPage(1);
    },
  };
}
