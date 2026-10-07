import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

const MAX_PHASES_PER_TYPE = 4;

interface HeaderProps {
  headingId: string;
  label: string;
  count: number;
  busy: boolean;
  onAdd: () => void;
}

/** Título de la sección de una fase con su contador y «Añadir recurso». */
export function ResourceListHeader({
  headingId,
  label,
  count,
  busy,
  onAdd,
}: Readonly<HeaderProps>) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={headingId} className="text-sm font-semibold text-foreground">
        {label}{" "}
        <span className="text-xs font-normal tabular-nums text-muted-foreground">
          {count} {t("workspace:de")} {MAX_PHASES_PER_TYPE} {t("workspace:recursos_157")} </span>
      </h2>
      {count >= MAX_PHASES_PER_TYPE ? (
        <span className="text-xs text-muted-foreground">{t("workspace:maximo_de_recursos_alcanzado")}</span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("workspace:anadir_recurso_a_value", { p0: label })}
          // Mientras se regenera el OVA el backend rechaza añadir (409).
          disabled={busy}
          onClick={onAdd}
        >
          <Icon name="plus" />
          {t("workspace:anadir_recurso")} </Button>
      )}
    </div>
  );
}
