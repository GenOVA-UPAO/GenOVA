import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface Props {
  /** Código HTTP del fallo (0 si no hubo respuesta). */
  status: number;
  message: string;
  onRetry: () => void;
}

function copyFor(status: number, message: string, t: TFunction): { title: string; description: string } {
  if (status === 404) {
    return {
      title: t("workspace:no_encontramos_este_ova"),
      description: t("workspace:ovaNotFoundHint"),
    };
  }
  if (status === 403) {
    return {
      title: t("workspace:no_tienes_acceso_a_este_ova"),
      description: t("workspace:solo_la_persona_que_lo_creo_puede_abrirlo_en_el_editor"),
    };
  }
  return { title: t("workspace:no_se_pudo_abrir_el_ova"), description: message };
}

/**
 * El OVA no se pudo abrir: explica qué pasó y ofrece lo que sirve. Reintentar
 * solo tiene sentido si el fallo puede ser pasajero (red o servidor), no si el
 * OVA no existe o no es tuyo.
 */
export function WorkspaceLoadError({ status, message, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  const permanent = status === 404 || status === 403;
  const copy = copyFor(status, message, t);
  return (
    <div role="alert" className="mx-auto w-full max-w-xl p-6">
      <EmptyState
        icon="warning-circle"
        tone="danger"
        title={copy.title}
        description={copy.description}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {status === 404 && (
              <Button variant="outline" asChild>
                <Link to="/papelera">{t("workspace:ver_la_papelera")}</Link>
              </Button>
            )}
            <Button variant={permanent ? "default" : "outline"} asChild>
              <Link to="/mis-ovas">{t("workspace:volver_a_mis_ovas")}</Link>
            </Button>
            {!permanent && <Button onClick={onRetry}>{t("workspace:reintentar")}</Button>}
          </div>
        }
      />
    </div>
  );
}
