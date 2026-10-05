import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";

/** El OVA se quedó sin recursos (se eliminaron todos): se explica cómo volver a llenarlo. */
export function WorkspacePreviewEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon="eye"
        title={t("workspace:este_ova_no_tiene_recursos")}
        description={t("workspace:ve_a_editar_y_usa_anadir_recurso_en_una_fase__e7c683")}
      />
    </div>
  );
}
