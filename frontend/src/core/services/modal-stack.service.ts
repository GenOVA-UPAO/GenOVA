import { Injectable } from "@angular/core";

let nextId = 0;

/**
 * Coordina el cierre con Escape entre modales apilados (tanto los respaldados
 * por CDK vía `gn-dialog` como los overlays a mano con `gnModalDismiss`), de
 * forma que solo el modal superior consume la tecla.
 *
 * Sin esto, un modal anidado (ej. "Configurar recurso" dentro del selector de
 * fases 5E) y su modal padre reciben el mismo evento `keydown.Escape` y ambos
 * se cierran a la vez, dando la sensación de que Escape cierra todo el flujo
 * en vez de solo el modal superior.
 */
@Injectable({ providedIn: "root" })
export class ModalStackService {
  private readonly stack: number[] = [];

  /** Registra un modal como abierto y devuelve su id de stack. */
  push(): number {
    const id = nextId++;
    this.stack.push(id);
    return id;
  }

  /** Retira un modal del stack (al cerrarse o destruirse). */
  pop(id: number): void {
    const idx = this.stack.indexOf(id);
    if (idx !== -1) this.stack.splice(idx, 1);
  }

  /** True si `id` es el modal abierto más reciente (el que debe recibir Escape). */
  isTop(id: number): boolean {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === id;
  }
}
