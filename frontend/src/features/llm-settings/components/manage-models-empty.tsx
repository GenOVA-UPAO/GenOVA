import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface ManageModelsEmptyProps {
  /** `keys`: sin clave propia; `filters`: nada coincide; `catalog`: ningún proveedor dio su lista. */
  kind: "keys" | "filters" | "catalog";
  onAddKey: () => void;
  onClearFilters: () => void;
}

export function ManageModelsEmpty({ kind, onAddKey, onClearFilters }: Readonly<ManageModelsEmptyProps>) {
  const { t } = useTranslation("llm-settings");

  if (kind === "keys") {
    return (
      <EmptyState
        className="m-5 border-0"
        icon="lock"
        title={t("catalog.emptyNoKeysTitle")}
        description={t("catalog.emptyNoKeysDesc")}
        action={<Button onClick={onAddKey}>{t("catalog.addApiKey")}</Button>}
      />
    );
  }
  if (kind === "catalog") {
    return (
      <EmptyState
        className="m-5 border-0"
        icon="squares-four"
        title={t("catalog.emptyCatalogTitle")}
        description={t("catalog.emptyCatalogDesc")}
        action={<Button onClick={onAddKey}>{t("catalog.goToCredentials")}</Button>}
      />
    );
  }
  return (
    <EmptyState
      className="m-5 border-0"
      icon="magnifying-glass-minus"
      title={t("catalog.emptyNoMatchTitle")}
      description={t("catalog.emptyNoMatchDesc")}
      action={
        <Button variant="outline" onClick={onClearFilters}>
          {t("catalog.clearFilters")}
        </Button>
      }
    />
  );
}

