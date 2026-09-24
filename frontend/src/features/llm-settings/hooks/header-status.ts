export function favoritesLabel(count: number): string {
  if (count === 0) return "Las listas muestran todo el catálogo";
  return count === 1 ? "1 modelo activado" : `${String(count)} modelos activados`;
}

export function headerStatusText(connected: number, total: number, favorites: string): string {
  if (total === 0) return favorites;
  const providers = total === 1 ? "proveedor conectado" : "proveedores conectados";
  return `${String(connected)} de ${String(total)} ${providers} · ${favorites}`;
}
