import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import { useLlmSettings } from "../hooks/use-llm-settings";

interface ManageModelsFooterProps {
  /** Quedan filas por pintar de las ya cargadas. */
  hasMoreRows: boolean;
  onShowMore: () => void;
}

/**
 * Pie de la lista: más filas (se pintan solas al bajar; el botón es para
 * teclado y lectores de pantalla) o más páginas del servidor si el catálogo
 * no cupo en una.
 */
export function ManageModelsFooter({ hasMoreRows, onShowMore }: Readonly<ManageModelsFooterProps>) {
  const { t } = useTranslation("llm-settings");
  const store = useLlmSettings();
  if (hasMoreRows) {
    return (
      <div className="flex justify-center py-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground max-sm:h-11" onClick={onShowMore}>
          {t("catalog.showMoreModels")}
        </Button>
      </div>
    );
  }
  if (store.fullHasMore) {
    return (
      <div className="flex flex-col items-center gap-2 py-5">
        <p className="text-xs text-muted-foreground">
          {t("catalog.loadedCountOf", { loaded: store.catalogFull.length, total: store.fullTotal })}
        </p>
        <Button variant="outline" className="max-sm:h-11" loading={store.loadingMore} onClick={store.loadMore}>
          {t("catalog.loadMoreModels")}
        </Button>
      </div>
    );
  }
  return <p className="py-4 text-center text-xs text-muted-foreground">{t("catalog.noMoreModels")}</p>;
}

