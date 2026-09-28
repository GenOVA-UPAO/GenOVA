import { Icon } from "@/core/components/icon";

import type { ModelTestState } from "../hooks/use-model-test";
import { modelTestOutcome } from "../lib/model-test";
import { TONE_STYLE } from "./model-test-tone";

/** Icono del botón «Probar»: matraz, girando mientras prueba, y luego el resultado. */
export function ModelTestIcon({
  running,
  current,
}: Readonly<{ running: boolean; current: ModelTestState | null }>) {
  if (running) {
    return (
      <Icon name="spinner" size="text-sm" className="animate-spin motion-reduce:animate-none" />
    );
  }
  if (current?.result) {
    const { icon, className } = TONE_STYLE[modelTestOutcome(current.result).tone];
    return <Icon name={icon} size="text-sm" className={className} />;
  }
  if (current?.error) {
    return <Icon name="warning-circle" size="text-sm" className="text-destructive" />;
  }
  return <Icon name="flask" size="text-sm" />;
}
