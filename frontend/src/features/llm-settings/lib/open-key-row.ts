/**
 * Tras «Conectar proveedor» se cambia a Credenciales y se abre el campo de la
 * clave de ese proveedor. Antes el foco se perdía en <body> y había que buscar
 * la fila a mano. Espera a que la pestaña y el diálogo terminen de cambiar.
 */
export function openKeyRow(provider: string): void {
  let frames = 0;
  const tick = () => {
    const row = document.querySelector<HTMLElement>(`[data-key-row="${CSS.escape(provider)}"]`);
    const button = row?.querySelector<HTMLButtonElement>("button");
    if (row && button) {
      row.scrollIntoView({ block: "center" });
      button.click();
      return;
    }
    frames += 1;
    if (frames < 30) requestAnimationFrame(tick);
  };
  window.setTimeout(tick, 200);
}
