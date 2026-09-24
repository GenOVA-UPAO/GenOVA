import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { CatalogStatusAlert } from "./catalog-status-alert";
import { UnconnectedProvidersNote } from "./unconnected-providers-note";

interface ModelsOverviewBarProps {
  isAdmin: boolean;
  onOpenCatalog: () => void;
  onConnectProvider: (provider: string) => void;
}

/** Cabecera de la pestaña Modelos: catálogo y estado de los proveedores. */
export function ModelsOverviewBar({
  isAdmin,
  onOpenCatalog,
  onConnectProvider,
}: Readonly<ModelsOverviewBarProps>) {
  const store = useLlmSettings();
  // Sin clave propia el catálogo solo decía «Aún no tienes claves API»: el
  // camino ya lo indica el aviso de cada tarea.
  const canBrowseCatalog = isAdmin || store.hasOwnLlmKey;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Elige una tarea para ver su modelo principal y sus modelos de respaldo.
        </p>
        {canBrowseCatalog ? (
          <Button variant="outline" onClick={onOpenCatalog} className="shrink-0 max-sm:h-11">
            <Icon name="squares-four" size="text-sm" />
            Abrir catálogo
          </Button>
        ) : null}
      </div>
      <CatalogStatusAlert
        catalogStatus={store.catalogStatus}
        refreshing={store.refreshingCatalog}
        canFixKeys={isAdmin}
        onRetry={() => {
          void store.retryRefresh();
        }}
      />
      {isAdmin ? (
        <UnconnectedProvidersNote catalogStatus={store.catalogStatus} onConnect={onConnectProvider} />
      ) : null}
    </>
  );
}
