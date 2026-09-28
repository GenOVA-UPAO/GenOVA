import type { Config, DriveStep, PopoverDOM } from "driver.js";

const STEPS: DriveStep[] = [
  {
    element: "#tour-crear-ova-prompt",
    popover: {
      title: "Describe tu tema",
      description:
        "Escribe el tema, los objetivos y el nivel. Si quieres ver cómo se hace, pulsa «Usar ejemplo».",
      // En el primer paso no hay «Anterior»: un botón deshabilitado parecía roto.
      showButtons: ["next", "close"],
    },
  },
  {
    element: "#tour-crear-ova-config",
    popover: {
      title: "Elige recursos",
      description:
        "Pulsa Recursos para elegir qué generará la IA en cada fase. Necesitas recursos en al menos 2 fases. Archivos, Tema y Nivel educativo son opcionales.",
    },
  },
  {
    element: "#tour-crear-ova-generar",
    popover: {
      title: "Genera el OVA",
      description:
        "«Generar OVA» se activa cuando la descripción tiene al menos 10 caracteres y hay recursos en 2 fases. Si falta algo, lo verás junto al botón.",
    },
  },
];

/**
 * driver.js crea el popover con textos en inglés («Close») y sin foco dentro.
 * Se traduce el cierre y se lleva el foco al botón principal del paso, para
 * que el teclado y los lectores de pantalla empiecen donde está la acción.
 */
function localizePopover(popover: PopoverDOM) {
  popover.closeButton.setAttribute("aria-label", "Cerrar tutorial");
  popover.closeButton.setAttribute("title", "Cerrar tutorial");
  requestAnimationFrame(() => {
    popover.nextButton.focus({ preventScroll: true });
  });
}

/** Configuración del tutorial de /crear; `onDone` se llama al cerrarlo o terminarlo. */
export function crearOvaTourConfig(onDone: () => void): Config {
  return {
    popoverClass: "gn-tour",
    showProgress: true,
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Entendido",
    progressText: "Paso {{current}} de {{total}}",
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
