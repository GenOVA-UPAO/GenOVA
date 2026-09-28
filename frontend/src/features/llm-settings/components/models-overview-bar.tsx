import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { platformStatusForUser } from "../lib/own-catalog-status";
import { CatalogStatusAlert } from "./catalog-status-alert";
import { OwnKeyStatusAlert } from "./own-key-status-alert";
import { UnconnectedProvidersNote } from "./unconnected-providers-note";

interface ModelsOverviewBarProps {
  isAdmin: boolean;
  onOpenCatalog: () => void;
  onConnectProvider: (provider: string) => void;
  /** Lleva a la clave propia del proveedor en Credenciales. */
  onGoToOwnKey: (provider: string) => void;
}

/** Cabecera de la pestaña Modelos: catálogo y estado de los proveedores. */
export function ModelsOverviewBar({
  isAdmin,
  onOpenCatalog,
  onConnectProvider,
  onGoToOwnKey,
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
        // Donde el usuario tiene su clave cuenta su lista, no la de la plataforma.
        catalogStatus={
          isAdmin
            ? store.catalogStatus
            : platformStatusForUser(store.catalogStatus, store.ownCatalogStatus)
        }
        refreshing={store.refreshingCatalog}
        canFixKeys={isAdmin}
        onRetry={() => {
          void store.retryRefresh();
        }}
      />
      {isAdmin ? null : (
        <OwnKeyStatusAlert
          status={store.ownCatalogStatus}
          refreshing={store.refreshingCatalog}
          onRetry={() => {
            void store.retryRefresh();
          }}
          onFixKey={onGoToOwnKey}
        />
      )}
      {isAdmin ? (
        <UnconnectedProvidersNote catalogStatus={store.catalogStatus} onConnect={onConnectProvider} />
      ) : null}
    </>
  );
}
