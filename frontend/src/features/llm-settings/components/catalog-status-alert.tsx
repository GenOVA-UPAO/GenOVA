import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { CatalogStatusEntry } from "../hooks/llm-settings-store.types";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";

const listFormat = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

interface CatalogStatusAlertProps {
  catalogStatus: Record<string, CatalogStatusEntry> | null;
  refreshing: boolean;
  onRetry: () => void;
}

/** Aviso cuando algún proveedor no devolvió su catálogo: qué pasó y cómo reintentar. */
export function CatalogStatusAlert({
  catalogStatus,
  refreshing,
  onRetry,
}: Readonly<CatalogStatusAlertProps>) {
  const down = Object.entries(catalogStatus ?? {}).filter(([, status]) => !status.ok);
  if (down.length === 0) return null;
  const names = listFormat.format(down.map(([id]) => PROVIDER_LABELS[id] ?? id));

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-accent-brand/25 bg-accent-brand/5 px-4 py-3 sm:flex-row sm:items-center"
    >
      <Icon name="warning" size="text-lg" className="hidden shrink-0 text-accent-brand sm:block" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">No pudimos obtener los modelos de {names}</p>
        <p className="text-muted-foreground">
          Sus modelos no aparecerán en las listas hasta que respondan. Revisa sus claves en
          Credenciales o vuelve a intentarlo.
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0 max-sm:h-11"
        onClick={onRetry}
        loading={refreshing}
      >
        <Icon name="arrow-clockwise" size="text-sm" />
        Reintentar
      </Button>
    </div>
  );
}
