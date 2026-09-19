/**
 * Coordina el cierre con Escape entre overlays apilados hechos a mano, de modo
 * que solo el superior consume la tecla. Sin esto, un modal anidado y su padre
 * reciben el mismo `keydown` y se cierran a la vez.
 */
let nextId = 0;
const stack: number[] = [];

/** Registra un modal como abierto y devuelve su id de stack. */
export function pushModal(): number {
  const id = nextId++;
  stack.push(id);
  return id;
}

/** Retira un modal del stack (al cerrarse o desmontarse). */
export function popModal(id: number): void {
  const idx = stack.indexOf(id);
  if (idx !== -1) stack.splice(idx, 1);
}

/** True si `id` es el modal abierto más reciente (el que debe recibir Escape). */
export function isTopModal(id: number): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}
