import { useTranslation } from "react-i18next";
import { usePlatformConfig } from "@/core/hooks/use-platform-config";

import { groupProviders, PROVIDER_META, RECOMMENDED_HINT } from "./platform-key-meta";
import { PlatformKeyRow } from "./platform-key-row";

const LIST_CLASS = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card";

export function PlatformApiKeysList() {
  const { t } = useTranslation();
  const { data, isPending, error } = usePlatformConfig();

  if (isPending) {
    return (
      <div className={LIST_CLASS} role="status" aria-label={t("shared:cargando_claves_api")}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-56 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {t("shared:no_se_pudieron_cargar_las_claves")} {error.message}
      </p>
    );
  }
  const config = data.platform_config ?? {};
  const providers = data.providers ?? Object.keys(PROVIDER_META);
  const serverKeys = new Set(data.server_keys ?? []);
  const groups = groupProviders(providers);
  const group = (title: string, ids: string[], hint?: string) =>
    ids.length === 0 ? null : (
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <ul className={LIST_CLASS}>
          {ids.map((p) => (
            <PlatformKeyRow
              key={p}
              provider={p}
              maskedValue={config[p]}
              serverKey={serverKeys.has(p)}
            />
          ))}
        </ul>
      </div>
    );
  // OpenRouter primero: con una sola clave cubre texto, imagen y video.
  return (
    <div className="space-y-6">
      {group(t("shared:recomendado"), groups.recommended, RECOMMENDED_HINT)}
      {group(t("shared:otros_proveedores_de_texto"), groups.text)}
      {group(t("shared:otros_proveedores_de_imagen"), groups.image)}
    </div>
  );
}
