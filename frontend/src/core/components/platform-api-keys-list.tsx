import { usePlatformConfig } from "@/core/hooks/use-platform-config";

import { PROVIDER_META } from "./platform-key-meta";
import { PlatformKeyRow } from "./platform-key-row";

export function PlatformApiKeysList() {
  const { data, isPending, error } = usePlatformConfig();

  if (isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando API keys">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-bold text-destructive">
        {error.message}
      </p>
    );
  }
  const config = data.platform_config ?? {};
  const providers = data.providers ?? Object.keys(PROVIDER_META);
  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <PlatformKeyRow key={p} provider={p} maskedValue={config[p]} />
      ))}
    </div>
  );
}
