/**
 * Al cerrar un modal abierto desde el menú «Más acciones» de una tarjeta, Radix
 * devolvería el foco al elemento del menú, que ya no existe (acaba en <body>).
 * Este manejador de `onCloseAutoFocus` lo devuelve al botón del menú de esa
 * tarjeta; si la tarjeta ya no está (p. ej. se movió a la papelera), deja el
 * comportamiento por defecto.
 */
export function focusCardMenu(ovaId: string) {
  return (event: Event) => {
    const trigger = document.querySelector<HTMLElement>(
      `[data-ova-id="${CSS.escape(ovaId)}"] [data-slot="dropdown-menu-trigger"]`,
    );
    if (!trigger) return;
    event.preventDefault();
    trigger.focus();
  };
}
