import { providerMeta } from "@/core/components/platform-key-meta";

/**
 * Tras «Conectar proveedor» se cambia a Credenciales y se abre el campo de la
 * clave de ese proveedor. Antes el foco se perdía en <body> y había que buscar
 * la fila a mano. Espera a que la pestaña y el diálogo terminen de cambiar.
 */
export function openKeyRow(provider: string): void {
  openRow(() => document.querySelector<HTMLElement>(`[data-key-row="${CSS.escape(provider)}"]`));
}

/**
 * Igual que `openKeyRow`, pero en «Claves de la plataforma» (la que usa el
 * catálogo). Las filas de core no llevan marca propia: se localizan por el
 * nombre del proveedor dentro de esa sección.
 */
export function openPlatformKeyRow(provider: string): void {
  const label = providerMeta(provider).label.toLowerCase();
  openRow(() => {
    const marked = document.querySelector<HTMLElement>(
      `[data-platform-key-row="${CSS.escape(provider)}"]`,
    );
    if (marked) return marked;
    const rows = document.querySelectorAll<HTMLElement>('[aria-labelledby="claves-plataforma"] li');
    return Array.from(rows).find((row) =>
      row.textContent.trim().toLowerCase().startsWith(label),
    );
  });
}

/** Sin proveedor concreto: lleva el foco a la primera fila de «Tus claves», sin abrirla. */
export function focusFirstKeyRow(): void {
  openRow(() => document.querySelector<HTMLElement>("[data-key-row]"), false);
}

/** Las claves se piden al abrir Credenciales y a veces tardan segundos: se espera a que lleguen. */
const WAIT_MS = 10_000;

function openRow(findRow: () => HTMLElement | null | undefined, open = true): void {
  const deadline = performance.now() + WAIT_MS;
  const tick = () => {
    const row = findRow();
    const button = row?.querySelector<HTMLButtonElement>("button");
    if (row && button) {
      row.scrollIntoView({ block: "center" });
      if (open) button.click();
      else button.focus();
      return;
    }
    if (performance.now() < deadline) requestAnimationFrame(tick);
  };
  window.setTimeout(tick, 200);
}
