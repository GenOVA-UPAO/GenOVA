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
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (groupedEmpty) {
    return <ManageModelsEmpty kind="filters" onAddKey={onAddKey} onClearFilters={onClear} />;
  }
  return <ManageModelsList grouped={grouped} />;
}
