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
  credential_code?: string;
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

/** `connected` incluye los `unverified` (clave puesta, aún sin «Probar conexión»). */
export interface ProviderCount {
  connected: number;
  total: number;
  unverified: number;
}

/** Lo que da `GET /admin/platform-config` y hace falta para contar claves. */
export interface PlatformKeysSnapshot {
  platform_config?: Record<string, string>;
  providers?: string[];
  server_keys?: string[];
  checks?: Record<string, { code: string }>;
}

/**
 * Proveedores con clave de plataforma (guardada o del servidor), de todos los
 * que lista Credenciales. La cabecera contaba solo los de catálogo de texto
 * («2 de 4») mientras Credenciales ofrecía 8: parecía que faltaban proveedores.
 * `null` sin datos (aún cargando o no es admin): se cuenta por el catálogo.
 */
export function platformKeyCount(
  config: PlatformKeysSnapshot | null | undefined,
): ProviderCount | null {
  const providers = config?.providers ?? [];
  if (providers.length === 0) return null;
  let connected = 0;
  let unverified = 0;
  for (const p of providers) {
    const code = checkCode(config, p);
    if (code === "connected") connected += 1;
    // «Sin verificar»: hay clave y no se ha comprobado; sirve igual, así que cuenta.
    else if (code === "unchecked") unverified += 1;
  }
  return { connected: connected + unverified, total: providers.length, unverified };
}

function checkCode(config: PlatformKeysSnapshot | null | undefined, provider: string): string {
  const code = config?.checks?.[provider]?.code;
  if (code) return code;
  return hasKey(config, provider) ? "unchecked" : "no_key";
}

function hasKey(config: PlatformKeysSnapshot | null | undefined, provider: string): boolean {
  return Boolean(config?.platform_config?.[provider]) || (config?.server_keys ?? []).includes(provider);
}

/** Cuántos proveedores tienen clave de plataforma, de cuántos hay. */
export function connectedProviders(status: CatalogStatus | null | undefined): ProviderCount {
  const all = entries(status);
  const connected = all.filter(([, item]) =>
    typeof item.configured === "boolean" ? item.configured : item.ok,
  ).length;
  return { connected, total: all.length, unverified: 0 };
}

export function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] ?? id;
}
