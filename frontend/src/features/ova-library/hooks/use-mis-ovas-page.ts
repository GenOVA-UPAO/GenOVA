import { useState } from "react";

import type { MetadataInput } from "../lib/metadata-schema";
import type { OvaListItem } from "../lib/types";
import { useDebounce } from "./use-debounce";
import { useGeneratingJobs } from "./use-generating-jobs";
import { useOvaActions } from "./use-ova-actions";
import { useOvaList } from "./use-ova-library";

/** Hook de estado y lógica para la página Mis OVAs. */
export function useMisOvasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ovaToTrash, setOvaToTrash] = useState<OvaListItem | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingOva, setEditingOva] = useState<OvaListItem | null>(null);

  const { data, isLoading, error, refetch } = useOvaList({
    page,
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
  });

  const ovas = data?.ovas ?? [];
  const totalItems = data?.total_items ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const { jobs, resume } = useGeneratingJobs(ovas);
  const actions = useOvaActions();

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); setSelectedIds(new Set()); };
  const handleStatusChange = (val: string) => { setStatusFilter(val); setPage(1); setSelectedIds(new Set()); };
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmTrash = async () => {
    if (!ovaToTrash) return;
    const ok = await actions.moveToTrash(ovaToTrash.id);
    if (ok) setOvaToTrash(null);
  };

  const handleConfirmBulkTrash = async () => {
    const ok = await actions.batchMoveToTrash(Array.from(selectedIds));
    if (ok) { setShowBulkModal(false); setSelectedIds(new Set()); }
  };

  const handleSaveMetadata = (meta: MetadataInput) => {
    if (!editingOva) return;
    void actions.saveMetadata(editingOva.id, meta).then((ok) => { if (ok) setEditingOva(null); });
  };

  const allSelected = ovas.length > 0 && ovas.every((o) => selectedIds.has(o.id));

  return {
    page, setPage, totalItems, totalPages,
    search, handleSearchChange, statusFilter, handleStatusChange, debouncedSearch,
    selectedIds, setSelectedIds, handleToggleSelect, allSelected,
    ovaToTrash, setOvaToTrash, handleConfirmTrash,
    showBulkModal, setShowBulkModal, handleConfirmBulkTrash,
    editingOva, setEditingOva, handleSaveMetadata,
    ovas, jobs, resume, actions, isLoading, error, refetch,
  };
}
