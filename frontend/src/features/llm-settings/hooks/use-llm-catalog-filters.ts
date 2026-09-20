import { useEffect, useState } from "react";

import type { GroupBy, SortKey } from "../lib/catalog-sort";

const SEARCH_DEBOUNCE_MS = 300;

export function useLlmCatalogFilters() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [groupBy, setGroupBy] = useState<GroupBy>("provider");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  return {
    searchInput,
    searchQuery,
    categoryFilter,
    typeFilter,
    sortKey,
    groupBy,
    handleSearch: setSearchInput,
    handleCategory: setCategoryFilter,
    handleType: setTypeFilter,
    handleSort: setSortKey,
    handleGroup: setGroupBy,
  };
}
