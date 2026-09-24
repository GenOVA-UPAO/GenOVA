import type { ProviderMeta } from "./platform-key-meta";
import { PlatformKeyState } from "./platform-key-state";
import { hasCheck, type ProviderCheckState } from "./platform-provider-check";
import { ProviderCheckBadge } from "./platform-provider-check-badge";

interface PlatformKeyRowHeaderProps {
  meta: ProviderMeta;
  configured: boolean;
  serverKey: boolean;
  /** Última «Probar conexión»: si la hay, manda sobre lo que se sabe sin comprobar. */
  check: ProviderCheckState;
}

export function PlatformKeyRowHeader({
  meta,
  configured,
  serverKey,
  check,
}: Readonly<PlatformKeyRowHeaderProps>) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <span className="text-sm font-medium">{meta.label}</span>
        {hasCheck(check) ? (
          <ProviderCheckBadge check={check} />
        ) : (
          <PlatformKeyState configured={configured} serverKey={serverKey} />
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {meta.desc}
        {meta.compat ? ". Compatible con OpenAI" : null}
      </p>
    </div>
  );
}
