import { Icon } from "@/core/components/icon";

import {
  type Capability,
  CAPABILITY_HINTS,
  CAPABILITY_ICONS,
  CAPABILITY_LABELS,
} from "../lib/model-facts";

/** Capacidades además de texto (visión, razonamiento, código), con icono y nombre. */
export function ModelCapabilities({ capabilities }: Readonly<{ capabilities: Capability[] }>) {
  if (capabilities.length === 0) return null;
  return (
    <>
      {capabilities.map((cap) => (
        <span key={cap} className="inline-flex items-center gap-1" title={CAPABILITY_HINTS[cap]}>
          <Icon name={CAPABILITY_ICONS[cap]} size="text-xs" />
          {CAPABILITY_LABELS[cap]}
        </span>
      ))}
    </>
  );
}
