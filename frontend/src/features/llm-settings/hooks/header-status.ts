/** Favoritos: salen primero al elegir modelo. Sin ninguno no hay nada que decir. */
export function favoritesLabel(count: number): string {
  if (count === 0) return "";
  return count === 1 ? "1 modelo favorito" : `${String(count)} modelos favoritos`;
}

export function headerStatusText(connected: number, total: number, favorites: string): string {
  if (total === 0) return favorites;
  const providers = total === 1 ? "proveedor conectado" : "proveedores conectados";
  const base = `${String(connected)} de ${String(total)} ${providers}`;
  return favorites ? `${base} · ${favorites}` : base;
}
