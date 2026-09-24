import { useRef } from "react";

// Capas efímeras: su foco no sirve como destino al cerrar un diálogo.
const TRANSIENT = '[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"]';
const FOCUSABLE = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

// Último control enfocado fuera de menús y diálogos. Un diálogo que se abre
// desde un elemento de menú no puede volver a ese elemento (el menú ya se
// cerró): vuelve al botón que abrió el menú.
let lastStable: HTMLElement | null = null;

function remember(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  // Con ratón, algunos disparadores (el del menú de Radix) no llegan a
  // enfocarse: se recuerda el control pulsado.
  const control = target.closest<HTMLElement>(FOCUSABLE);
  if (control !== null && control.closest(TRANSIENT) === null) lastStable = control;
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (event) => {
      remember(event.target);
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      remember(event.target);
    },
    true,
  );
}

function openerCandidate(): HTMLElement | null {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    active.closest('[role="menu"],[role="listbox"]') === null
  ) {
    return active;
  }
  return lastStable;
}

interface AutoFocusHandlers {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Devuelve el foco, al cerrar un diálogo, al elemento que lo tenía al abrirlo.
 *
 * Radix solo lo devuelve a su `Trigger`; los diálogos que se abren con `open`
 * controlado (casi todos en la app) no lo tienen y el foco caía en <body>, así
 * que con teclado había que recorrer la página otra vez. Respeta a quien llame
 * a `preventDefault()` en su propio `onCloseAutoFocus`.
 */
export function useReturnFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: AutoFocusHandlers): Required<AutoFocusHandlers> {
  const previous = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event) => {
      previous.current = openerCandidate();
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      const target = previous.current;
      previous.current = null;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
