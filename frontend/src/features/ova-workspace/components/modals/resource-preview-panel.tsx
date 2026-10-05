import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

import type { Resource } from "../../lib/ova-types";
import { resourceDisplayName } from "../../lib/resource-display-name";
import { getResourcePreview } from "../../lib/resource-previews";
import { ResourceWireframe } from "./resource-wireframe";

const PANEL = "rounded-xl border border-border bg-muted/30 p-5";

export function ResourcePreviewPanel({
  phase,
  resource,
}: Readonly<{ phase: string; resource?: Resource }>) {
  const { t } = useTranslation();
  const previewLabel = t("workspace:vista_previa_del_recurso");
  const preview = resource ? getResourcePreview(phase, resource.id) : null;
  if (!resource)
    return (
      <aside
        aria-label={previewLabel}
        className={`flex min-h-64 flex-col items-center justify-center gap-3 border-dashed text-center ${PANEL}`}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="eye" className="size-5" />
        </span>
        <h3 className="font-display text-base font-semibold">{t("workspace:descubre_que_genera_cada_recurso")}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("workspace:pasa_el_cursor_o_selecciona_un_recurso_para_v_d47d25")} </p>
      </aside>
    );
  if (!preview)
    return (
      <aside aria-label={previewLabel} className={`space-y-1 ${PANEL}`}>
        <h3 className="font-semibold">
          {resource.tipo ? resourceDisplayName(resource.tipo) : t("workspace:recurso")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("workspace:vista_previa_no_disponible_para_este_recurso")} </p>
      </aside>
    );
  return (
    <aside aria-label={previewLabel} className={`space-y-4 ${PANEL}`}>
      <div className="space-y-1.5">
        <h3 className="text-lg leading-snug font-semibold">{resourceDisplayName(preview.label)}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{preview.returns}</p>
      </div>
      <figure className="space-y-2">
        <ResourceWireframe kind={preview.wire} phaseColor="var(--primary)" />
        <figcaption className="text-xs text-muted-foreground">
          {t("workspace:esquema_ilustrativo_el_contenido_real_se_crea_cad35a")} </figcaption>
      </figure>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">{t("workspace:formato")}</dt>
          <dd className="mt-0.5 font-medium">{preview.format}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">{t("workspace:que_incluye")}</dt>
          <dd>
            <ul className="mt-1.5 space-y-2">
              {preview.bullets.map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </aside>
  );
}
