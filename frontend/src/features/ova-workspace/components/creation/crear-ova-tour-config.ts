import type { Config, DriveStep, PopoverDOM } from "driver.js";
import i18n from "i18next";

const STEPS: DriveStep[] = [
  {
    element: "#tour-crear-ova-prompt",
    popover: {
      get title() { return i18n.t("workspace:describe_tu_tema"); },
      get description() { return i18n.t("workspace:tourTopicHint"); },
      // En el primer paso no hay «Anterior»: un botón deshabilitado parecía roto.
      showButtons: ["next", "close"],
    },
  },
  {
    element: "#tour-crear-ova-config",
    popover: {
      get title() { return i18n.t("workspace:elige_recursos"); },
      get description() { return i18n.t("workspace:tourResourcesHint"); },
    },
  },
  {
    element: "#tour-crear-ova-generar",
    popover: {
      get title() { return i18n.t("workspace:genera_el_ova"); },
      get description() { return i18n.t("workspace:tourGenerateHint"); },
    },
  },
];

/**
 * driver.js crea el popover con textos en inglés («Close») y sin foco dentro.
 * Se traduce el cierre y se lleva el foco al botón principal del paso, para
 * que el teclado y los lectores de pantalla empiecen donde está la acción.
 */
function localizePopover(popover: PopoverDOM) {
  popover.closeButton.setAttribute("aria-label", i18n.t("workspace:cerrar_tutorial"));
  popover.closeButton.setAttribute("title", i18n.t("workspace:cerrar_tutorial"));
  requestAnimationFrame(() => {
    popover.nextButton.focus({ preventScroll: true });
  });
}

/** Configuración del tutorial de /crear; `onDone` se llama al cerrarlo o terminarlo. */
export function crearOvaTourConfig(onDone: () => void): Config {
  return {
    popoverClass: "gn-tour",
    showProgress: true,
    nextBtnText: i18n.t("workspace:siguiente"),
    prevBtnText: i18n.t("workspace:anterior"),
    doneBtnText: i18n.t("workspace:entendido"),
    progressText: i18n.t("workspace:paso_current_de_total"),
    stagePadding: 6,
    stageRadius: 14,
    popoverOffset: 12,
    overlayOpacity: 0.55,
    steps: STEPS,
    onPopoverRender: localizePopover,
    // driver.js marca el elemento resaltado con aria-expanded, que no es
    // válido en un <section> (axe: aria-allowed-attr) y no aporta nada aquí.
    onHighlighted: (element?: Element) => {
      element?.removeAttribute("aria-expanded");
    },
    onDestroyed: onDone,
  };
}
