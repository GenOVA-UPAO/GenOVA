import { usePlatformConfig } from "@/core/hooks/use-platform-config";

import { PROVIDER_META } from "./platform-key-meta";
import { PlatformKeyRow } from "./platform-key-row";

const TEXT_PROVIDERS = new Set(["groq", "openrouter", "opencode", "huggingface"]);

const LIST_CLASS = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card";

export function PlatformApiKeysList() {
  const { data, isPending, error } = usePlatformConfig();

  if (isPending) {
    return (
      <div className={LIST_CLASS} role="status" aria-label="Cargando claves API">
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
        No se pudieron cargar las claves: {error.message}
      </p>
    );
  }
  const config = data.platform_config ?? {};
  const providers = data.providers ?? Object.keys(PROVIDER_META);
  const serverKeys = new Set(data.server_keys ?? []);
  const text = providers.filter((p) => TEXT_PROVIDERS.has(p));
  const media = providers.filter((p) => !TEXT_PROVIDERS.has(p));
  const group = (title: string, ids: string[]) =>
    ids.length === 0 ? null : (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
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
  // Agrupadas como «Tus claves»: primero las de texto, que son las que eligen modelo.
  return (
    <div className="space-y-6">
      {group("Modelos de texto", text)}
      {group("Imagen y video", media)}
    </div>
  );
}
