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
      <div className="flex flex-col items-center gap-1.5 border-t border-border/30 py-5">
        <p className="text-[11px] text-muted-foreground">
          Mostrando {store.catalogFull.length} de {store.fullTotal} modelos
        </p>
        <Button size="sm" variant="outline" onClick={store.loadMore} className="text-xs font-bold">
          Cargar más modelos
        </Button>
      </div>
    );
  }
  if (store.catalogFull.length > 0) {
    return (
      <p className="py-4 text-center text-[11px] text-muted-foreground/50">
        {store.catalogFull.length} modelos en total
      </p>
    );
  }
  return null;
}
