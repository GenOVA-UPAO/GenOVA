import { useState } from "react";

import type { MetadataInput } from "../lib/metadata-schema";
import { pageMeta } from "../lib/page-meta";
import type { OvaListItem } from "../lib/types";
import { useDebounce } from "./use-debounce";
import { useGeneratingJobs } from "./use-generating-jobs";
import { useOvaActions } from "./use-ova-actions";
import { useOvaList } from "./use-ova-library";
import { useOvaSelection } from "./use-ova-selection";
import { useStatusParam } from "./use-status-param";

/** Hook de estado y lógica para la página Mis OVAs. */
export function useMisOvasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useStatusParam();

  const [ovaToTrash, setOvaToTrash] = useState<OvaListItem | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingOva, setEditingOva] = useState<OvaListItem | null>(null);

  const { data, isLoading, isPlaceholderData, error, refetch } = useOvaList({
    page,
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
  });

  const { ovas, totalItems, totalPages } = pageMeta(data);
  // Si se vacía la última página (p. ej. tras mover sus OVAs a la papelera),
  // vuelve a la última que existe en vez de mostrar una lista vacía.
  if (data && !isPlaceholderData && page > totalPages) setPage(totalPages);

  const selection = useOvaSelection(ovas.filter((o) => o.status !== "generando").map((o) => o.id));
  const { jobs, resume } = useGeneratingJobs(ovas);
  const actions = useOvaActions();

  const resetPaging = () => { setPage(1); selection.clear(); };
  const handleSearchChange = (val: string) => { setSearch(val); resetPaging(); };
  const handleStatusChange = (val: string) => { setStatusFilter(val); resetPaging(); };
  const handleClearFilters = () => { setSearch(""); setStatusFilter("all"); resetPaging(); };
  const handlePageChange = (next: number) => { setPage(next); selection.clear(); };

  const handleConfirmTrash = async () => {
    if (!ovaToTrash) return;
    const ok = await actions.moveToTrash(ovaToTrash.id);
    if (ok) { selection.remove(ovaToTrash.id); setOvaToTrash(null); }
  };

  const handleConfirmBulkTrash = async () => {
    const ok = await actions.batchMoveToTrash(Array.from(selection.selectedIds));
    if (ok) { setShowBulkModal(false); selection.clear(); }
  };

  const handleSaveMetadata = (meta: MetadataInput) => {
    if (!editingOva) return;
    void actions.saveMetadata(editingOva.id, meta).then((ok) => { if (ok) setEditingOva(null); });
  };

  return {
    page, handlePageChange, totalItems, totalPages,
    search, handleSearchChange, statusFilter, handleStatusChange, handleClearFilters, debouncedSearch,
    selection,
    ovaToTrash, setOvaToTrash, handleConfirmTrash,
    showBulkModal, setShowBulkModal, handleConfirmBulkTrash,
    editingOva, setEditingOva, handleSaveMetadata,
    ovas, jobs, resume, actions, isLoading, isStale: isPlaceholderData, error, refetch,
  };
}
