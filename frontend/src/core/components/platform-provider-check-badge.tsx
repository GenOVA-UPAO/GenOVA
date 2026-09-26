import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import {
  CHECK_TONE_DOT,
  CHECK_TONE_TEXT,
  type ProviderCheckState,
  providerCheckText,
} from "./platform-provider-check";

/**
 * Estado de la conexión junto al nombre del proveedor tras «Probar conexión»:
 * «Comprobando…», «Conectado · 312 modelos», «Clave no válida»… Solo se pinta
 * si hay comprobación (`hasCheck`); si no, la fila muestra lo que sabe sin comprobar.
 */
export function ProviderCheckBadge({ check }: Readonly<{ check: ProviderCheckState }>) {
  if (check.checking || !check.result) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon name="spinner" size="text-xs" className="animate-spin motion-reduce:animate-none" />
        Comprobando…
      </span>
    );
  }
  const { tone, label } = providerCheckText(check.result);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", CHECK_TONE_TEXT[tone])}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", CHECK_TONE_DOT[tone])} />
      {label}
    </span>
  );
}
