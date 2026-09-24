import type { ReactNode } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { type ProviderCheckState, providerCheckText } from "./platform-provider-check";

/**
 * Región viva bajo la fila: anuncia el resultado sin mover el foco (la
 * comprobación también se lanza sola al guardar una clave) y, si algo falla,
 * dice qué hacer.
 */
export function ProviderCheckStatus({ check }: Readonly<{ check: ProviderCheckState }>) {
  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {statusContent(check)}
    </div>
  );
}

function statusContent(check: ProviderCheckState): ReactNode {
  if (check.checking) return <span className="sr-only">Comprobando la conexión…</span>;
  if (check.error) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-foreground">
        <Icon name="warning" size="text-sm" className="mt-px shrink-0 text-accent-brand" />
        {check.error.message}
      </p>
    );
  }
  if (!check.result) return null;
  const text = providerCheckText(check.result);
  if (text.tone === "success") return <span className="sr-only">{text.label}</span>;
  return (
    <p
      className={cn(
        "text-xs",
        text.tone === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <span className="sr-only">{text.label}. </span>
      {text.hint}
    </p>
  );
}
