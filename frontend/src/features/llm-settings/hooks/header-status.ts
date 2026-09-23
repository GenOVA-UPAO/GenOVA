export function favoritesLabel(count: number): string {
  if (count === 0) return "Se usan todos los modelos del catálogo";
  return count === 1 ? "1 modelo favorito" : `${String(count)} modelos favoritos`;
}

export function connectedProviders(status: Record<string, { ok: boolean }> | null): {
  ok: number;
  total: number;
} {
  const entries = Object.values(status ?? {});
  return { ok: entries.filter((item) => item.ok).length, total: entries.length };
}

export function headerStatusText(ok: number, total: number, favorites: string): string {
  if (total === 0) return favorites;
  const providers = total === 1 ? "proveedor conectado" : "proveedores conectados";
  return `${String(ok)} de ${String(total)} ${providers} · ${favorites}`;
}
