import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/core/components/page-header";

interface ModelsPageHeaderProps {
  status?: string;
  /** Sin clave propia un usuario solo consulta: «Elige…» prometía algo que no podía hacer. */
  canEdit?: boolean;
  /** Perfiles e historial (solo admin). */
  actions?: ReactNode;
}

export function ModelsPageHeader({
  status,
  canEdit = true,
  actions,
}: Readonly<ModelsPageHeaderProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <PageHeader
      title={t("page.title")}
      actions={actions}
      subtitle={
        <>
          {canEdit ? t("page.headerDescAdmin") : t("page.headerDescUser")}
          {status ? <span className="mt-1 block text-xs">{status}</span> : null}
        </>
      }
    />
  );
}
