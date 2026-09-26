import type { CatalogBrowser } from "../hooks/use-catalog-browser";
import { CatalogSkeleton } from "./catalog-skeleton";
import { ManageModelsEmpty } from "./manage-models-empty";
import { ManageModelsList } from "./manage-models-list";

interface ManageModelsBodyProps {
  hasKey: boolean;
  loading: boolean;
  browser: CatalogBrowser;
  usage: Record<string, string[]>;
  onAddKey: () => void;
}

export function ManageModelsBody({ hasKey, loading, browser, usage, onAddKey }: Readonly<ManageModelsBodyProps>) {
  if (!hasKey) return <ManageModelsEmpty kind="keys" onAddKey={onAddKey} onClearFilters={browser.clear} />;
  if (loading) return <CatalogSkeleton />;
  if (browser.results.length === 0) {
    return (
      <ManageModelsEmpty
        kind={browser.filtered ? "filters" : "catalog"}
        onAddKey={onAddKey}
        onClearFilters={browser.clear}
      />
    );
  }
  return <ManageModelsList browser={browser} usage={usage} />;
}
