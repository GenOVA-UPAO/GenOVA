import { useRef } from "react";

const MENUS = '[role="menu"],[role="listbox"]';
const DIALOGS = '[role="dialog"],[role="alertdialog"]';
const FOCUSABLE = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

// Último control enfocado fuera de menús y diálogos. Un diálogo que se abre
// desde un elemento de menú no puede volver a ese elemento (el menú ya se
// cerró): vuelve al botón que abrió el menú.
let lastStable: HTMLElement | null = null;
// Último control enfocado fuera de menús, aunque esté dentro de un diálogo o
// panel: un diálogo abierto desde un panel lateral (borrar un perfil desde su
// menú) debe volver a ese panel, no a la página que queda detrás.
let lastAny: HTMLElement | null = null;

function remember(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  // Con ratón, algunos disparadores (el del menú de Radix) no llegan a
  // enfocarse: se recuerda el control pulsado.
  const control = target.closest<HTMLElement>(FOCUSABLE);
  if (control?.closest(MENUS) !== null) return;
  lastAny = control;
  if (control.closest(DIALOGS) === null) lastStable = control;
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
  if (active instanceof HTMLElement && active !== document.body && active.closest(MENUS) === null) {
    return active;
  }
  return lastAny?.isConnected ? lastAny : lastStable;
}

/**
 * Si el control de origen ya no existe (se borró la fila que lo tenía): el
 * diálogo o panel que sigue abierto debajo, para no sacar el foco de él; si
 * no queda ninguno, el último control de la página.
 */
function fallbackTarget(
  closing: EventTarget | null,
  stable: HTMLElement | null,
): HTMLElement | null {
  const open = [...document.querySelectorAll<HTMLElement>(DIALOGS)].filter(
    (dialog) => dialog !== closing && dialog.dataset.state === "open",
  );
  if (open.length > 0) return open[open.length - 1];
  return stable?.isConnected ? stable : null;
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
  const stable = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event) => {
      previous.current = openerCandidate();
      stable.current = lastStable;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event) => {
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      const opener = previous.current;
      previous.current = null;
      const target = opener?.isConnected
        ? opener
        : fallbackTarget(event.currentTarget, stable.current);
      if (target) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
