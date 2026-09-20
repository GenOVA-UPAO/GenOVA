import { Alert, AlertTitle } from "@/core/components/ui/alert";
import { Button } from "@/core/components/ui/button";

import type { CatalogStatusEntry } from "../hooks/llm-settings-store.types";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";

const listFormat = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

interface CatalogStatusAlertProps {
  catalogStatus: Record<string, CatalogStatusEntry> | null;
  refreshing: boolean;
  onRetry: () => void;
}

export function CatalogStatusAlert({
  catalogStatus,
  refreshing,
  onRetry,
}: Readonly<CatalogStatusAlertProps>) {
  const down = Object.entries(catalogStatus ?? {}).filter(([, status]) => !status.ok);
  if (down.length === 0) return null;
  const names = listFormat.format(down.map(([id]) => PROVIDER_LABELS[id] ?? id));

  return (
    <Alert className="rounded-lg border border-accent-brand/40 bg-accent-brand/5">
      <div className="flex flex-col items-stretch gap-2 px-1 py-0.5 sm:flex-row sm:items-center sm:gap-x-3 sm:gap-y-1">
        <AlertTitle className="m-0 min-w-0 flex-1 text-sm font-semibold">
          No pudimos obtener los modelos de {names}
        </AlertTitle>
        <Button size="sm" variant="outline" className="shrink-0" onClick={onRetry} disabled={refreshing}>
          <span className={refreshing ? "animate-spin" : undefined}>↻</span>
          {refreshing ? "Reintentando…" : "Reintentar"}
        </Button>
      </div>
    </Alert>
  );
}
