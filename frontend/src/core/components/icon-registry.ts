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

/** Carga el juego extendido de iconos una sola vez y lo fusiona en ICONS. */
export function loadFullIconRegistry(): Promise<void> {
  lazyIconsPromise ??= import("./icon-registry-lazy").then((m) => {
    Object.assign(ICONS, m.LAZY_ICONS);
  });
  return lazyIconsPromise;
}

export type IconName = keyof typeof ICONS;
