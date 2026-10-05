import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { type CatalogStatus, failedProviders, providerLabel } from "../lib/catalog-status";
import { joinList } from "../lib/join-list";

interface CatalogStatusAlertProps {
  catalogStatus: CatalogStatus | null;
  refreshing: boolean;
  /** Solo quien puede cambiar las claves de la plataforma recibe la pista de revisarlas. */
  canFixKeys: boolean;
  onRetry: () => void;
}

/**
 * Aviso cuando un proveedor conectado no devolvió su catálogo. Los que no
 * tienen clave no son un fallo: salen en `UnconnectedProvidersNote`.
 */
export function CatalogStatusAlert({
  catalogStatus,
  refreshing,
  canFixKeys,
  onRetry,
}: Readonly<CatalogStatusAlertProps>) {
  const { t } = useTranslation("llm-settings");
  const down = failedProviders(catalogStatus);
  if (down.length === 0) return null;
  const names = joinList(down.map(providerLabel));
  const hint = canFixKeys
    ? t("catalog.alertRetryHint")
    : t("catalog.alertRetryLaterHint");

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-accent-brand/25 bg-accent-brand/5 px-4 py-3 sm:flex-row sm:items-center"
    >
      <Icon name="warning" size="text-lg" className="hidden shrink-0 text-accent-brand sm:block" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{t("catalog.couldNotGetModelsFrom", { providers: names })}</p>
        <p className="text-muted-foreground">
          {t("catalog.missingUntilResponds", { count: down.length })}{" "}
          {hint}
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0 max-sm:h-11"
        onClick={onRetry}
        loading={refreshing}
      >
        <Icon name="arrow-clockwise" size="text-sm" />
        {t("credentials.retry")}
      </Button>
    </div>
  );
}
