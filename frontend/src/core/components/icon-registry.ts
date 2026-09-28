import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  type Icon as PhosphorIcon,
  QuestionIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

/**
 * Explicit name → component map: only these icons end up in the bundle
 * (the Angular app shipped the whole Phosphor web font for ~100 glyphs).
 *
 * Tres niveles para mantener el entry pequeño:
 *  - eager (este módulo, chunk inicial): solo lo que pintan las rutas guest.
 *  - icon-registry-shell (import estático del layout autenticado): iconos de
 *    navbar/sidebar, asignados al módulo evaluarse (sin flash de "?").
 *  - icon-registry-lazy: el resto, diferido hasta idle/primera necesidad.
 */
export const ICONS = {
  "check-circle": CheckCircleIcon,
  "envelope-simple": EnvelopeSimpleIcon,
  question: QuestionIcon,
  "warning-circle": WarningCircleIcon,
} satisfies Record<string, PhosphorIcon>;

let lazyIconsPromise: Promise<void> | null = null;

// ICONS se completa mutándolo en sitio, así que su identidad nunca cambia. Un
// componente que lo lea durante el render no tiene forma de saber que creció:
// el React Compiler memoiza la búsqueda por el nombre y el icono se queda en
// "?" para siempre. Esta versión es lo que sí cambia, y se lee con
// useSyncExternalStore para que React vuelva a pintar a quien la consulte.
let registryVersion = 0;
const listeners = new Set<() => void>();

export function subscribeIconRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIconRegistryVersion(): number {
  return registryVersion;
}

/** Carga el juego extendido de iconos una sola vez y lo fusiona en ICONS. */
export function loadFullIconRegistry(): Promise<void> {
  lazyIconsPromise ??= import("./icon-registry-lazy").then((m) => {
    Object.assign(ICONS, m.LAZY_ICONS);
    registryVersion += 1;
    for (const listener of listeners) listener();
  });
  return lazyIconsPromise;
}

export type IconName = keyof typeof ICONS;
