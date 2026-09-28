import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { CONNECTION_LABELS, type ProviderConnection } from "../lib/provider-connection";

/** «Conectado» en verde o «Sin conectar» / «Sin respuesta» como aviso; nada si no se sabe. */
export function ConnectionLabel({ connection }: Readonly<{ connection: ProviderConnection }>) {
  if (connection === "unknown") return null;
  const ok = connection === "connected";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-normal whitespace-nowrap",
        ok ? "text-success-strong" : "text-accent-brand",
      )}
    >
      <Icon name={ok ? "check-circle" : "warning"} size="text-xs" />
      {CONNECTION_LABELS[connection]}
    </span>
  );
}
