import { Skeleton } from "@/core/components/ui/skeleton";

import type { CatalogGroup } from "../lib/catalog-sort";
import { ManageModelsEmpty } from "./manage-models-empty";
import { ManageModelsList } from "./manage-models-list";

interface ManageModelsBodyProps {
  hasKey: boolean;
  loading: boolean;
  groupedEmpty: boolean;
  grouped: CatalogGroup[];
  onAddKey: () => void;
  onClear: () => void;
}

export function ManageModelsBody({
  hasKey,
  loading,
  groupedEmpty,
  grouped,
  onAddKey,
  onClear,
}: Readonly<ManageModelsBodyProps>) {
  if (!hasKey) return <ManageModelsEmpty kind="keys" onAddKey={onAddKey} onClearFilters={onClear} />;
  if (loading) {
    return (
      <div className="space-y-3 p-5" role="status" aria-busy="true" aria-label="Cargando modelos">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (groupedEmpty) {
    return <ManageModelsEmpty kind="filters" onAddKey={onAddKey} onClearFilters={onClear} />;
  }
  return <ManageModelsList grouped={grouped} />;
}
