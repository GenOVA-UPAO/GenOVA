export function favoritesLabel(count: number): string {
  if (count === 0) return "Todos los modelos disponibles";
  return count === 1 ? "1 favorito" : `${String(count)} favoritos`;
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
  return `${String(ok)} / ${String(total)} proveedores · ${favorites}`;
}
