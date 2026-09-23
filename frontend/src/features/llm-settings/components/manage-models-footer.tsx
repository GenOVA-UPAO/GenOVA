import { Button } from "@/core/components/ui/button";

import { useLlmSettings } from "../hooks/use-llm-settings";

export function ManageModelsFooter() {
  const store = useLlmSettings();
  if (store.loadingMore) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (store.fullHasMore) {
    return (
      <div className="flex flex-col items-center gap-2 py-5">
        <p className="text-xs text-muted-foreground">
          Mostrando {store.catalogFull.length} de {store.fullTotal} modelos
        </p>
        <Button variant="outline" onClick={store.loadMore}>
          Cargar más modelos
        </Button>
      </div>
    );
  }
  if (store.catalogFull.length > 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        {store.catalogFull.length} modelos en total
      </p>
    );
  }
  return null;
}
