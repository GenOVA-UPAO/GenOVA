import { PROVIDER_LABELS } from "./llm-catalog.utils";

/** Estado del catálogo de un proveedor tal como lo devuelve `catalog_status`. */
export interface CatalogStatusEntry {
  ok: boolean;
  /**
   * `false`: la plataforma no tiene su clave y su lista no se pide (sin conectar,
   * no es un fallo). Ausente o `null` en backends anteriores: se trata como conectado.
   */
  configured?: boolean | null;
  last_success_at?: string;
}

export type CatalogStatus = Record<string, CatalogStatusEntry>;

function entries(status: CatalogStatus | null | undefined): [string, CatalogStatusEntry][] {
  return Object.entries(status ?? {});
}

/** Proveedores sin clave de plataforma: se ofrecen para conectar, no se avisan como error. */
export function unconnectedProviders(status: CatalogStatus | null | undefined): string[] {
  return entries(status)
    .filter(([, item]) => item.configured === false)
    .map(([id]) => id);
}

/** Proveedores conectados cuya lista de modelos no respondió: el único caso de aviso. */
export function failedProviders(status: CatalogStatus | null | undefined): string[] {
  return entries(status)
    .filter(([, item]) => item.configured !== false && !item.ok)
    .map(([id]) => id);
}

export function isProviderFailing(status: CatalogStatus | null | undefined, provider: string): boolean {
  return failedProviders(status).includes(provider);
}

/** Cuántos proveedores tienen clave de plataforma, de cuántos hay. */
export function connectedProviders(status: CatalogStatus | null | undefined): {
  connected: number;
  total: number;
} {
  const all = entries(status);
  const connected = all.filter(([, item]) =>
    typeof item.configured === "boolean" ? item.configured : item.ok,
  ).length;
  return { connected, total: all.length };
}

export function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] ?? id;
}
