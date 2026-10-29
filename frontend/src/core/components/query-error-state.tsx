import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface QueryErrorStateProps {
  title: string;
  onRetry: () => void;
}

/** Error de carga con mensaje en español y Reintentar (refetch). */
export function QueryErrorState({ title, onRetry }: Readonly<QueryErrorStateProps>) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <EmptyState
        icon="warning-circle"
        tone="danger"
        title={title}
        description={t("shared:comprueba_tu_conexion_e_intentalo_de_nuevo")}
        action={
          <Button variant="outline" onClick={onRetry}>
            {t("shared:reintentar")} </Button>
        }
      />
    </div>
  );
}
