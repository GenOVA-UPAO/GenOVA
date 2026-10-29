import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { previewWithoutTitles } from "../../lib/resource-label";

interface Props {
  name: string;
  /** Título del OVA: el HTML suele empezar con él y no aporta al resumen. */
  ovaTitle?: string;
  /** HTML guardado, del que se saca el resumen de texto. */
  saved: string;
  dirty: boolean;
  /** Controles de orden (subir/bajar). */
  reorder?: ReactNode;
}

/** Cabecera de un recurso en edición: nombre y resumen, o aviso de cambios sin guardar. */
export function WorkspacePhaseItemHeader({ name, ovaTitle, saved, dirty, reorder }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <header className="flex min-h-12 items-center gap-2 py-1.5 pr-1.5 pl-3">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold" title={name}>
          {name}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {dirty ? (
            <span className="font-medium text-foreground">{t("workspace:cambios_sin_guardar_en_el_html")}</span>
          ) : (
            previewWithoutTitles(saved, [ovaTitle ?? "", name])
          )}
        </p>
      </div>
      {reorder}
    </header>
  );
}
