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

/** Lo que da `GET /admin/platform-config` y hace falta para contar claves. */
export interface PlatformKeysSnapshot {
  platform_config?: Record<string, string>;
  providers?: string[];
  server_keys?: string[];
}

/**
 * Proveedores con clave de plataforma (guardada o del servidor), de todos los
 * que lista Credenciales. La cabecera contaba solo los de catálogo de texto
 * («2 de 4») mientras Credenciales ofrecía 8: parecía que faltaban proveedores.
 * `null` sin datos (aún cargando o no es admin): se cuenta por el catálogo.
 */
export function platformKeyCount(
  config: PlatformKeysSnapshot | null | undefined,
): { connected: number; total: number } | null {
  const providers = config?.providers ?? [];
  if (providers.length === 0) return null;
  const saved = config?.platform_config ?? {};
  const server = new Set(config?.server_keys ?? []);
  const connected = providers.filter((p) => Boolean(saved[p]) || server.has(p)).length;
  return { connected, total: providers.length };
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
