import { type CatalogStatus, failedProviders } from "./catalog-status";

/**
 * Estado de la lista de modelos de un proveedor pedida con la clave propia del
 * usuario (`own_catalog_status` de `GET /me/llm-settings`). El admin no lo
 * recibe: trabaja con las claves de la plataforma.
 */
export interface OwnCatalogStatusEntry {
  state: "not_connected" | "connected" | "error";
  /** `invalid_key` | `rate_limited` | `unreachable` | `error`. */
  error?: string | null;
  checked_at?: string | null;
  /** Modelos que el usuario ve de ese proveedor con su clave. */
  models?: number | null;
}

export type OwnCatalogStatus = Record<string, OwnCatalogStatusEntry>;

/** Estado de la clave propia tal como lo muestra la fila de Credenciales. */
export type OwnKeyView =
  | { kind: "none" }
  | { kind: "checking" }
  | { kind: "saved" }
  | { kind: "connected"; models: number | null }
  | { kind: "error"; code: string };

/**
 * Qué decir de la clave de `provider`. `configured` es si hay clave guardada;
 * el estado de su lista puede ir un paso por detrás justo después de guardarla.
 */
export function ownKeyView(
  status: OwnCatalogStatus | null | undefined,
  provider: string,
  configured: boolean,
): OwnKeyView {
  if (!configured) return { kind: "none" };
  const entry = status?.[provider];
  // Proveedor sin lista de modelos (imagen) o backend sin este dato.
  if (!entry) return { kind: "saved" };
  if (entry.state === "not_connected") return { kind: "checking" };
  if (entry.state === "error") return { kind: "error", code: entry.error ?? "error" };
  return { kind: "connected", models: entry.models ?? null };
}

/** Proveedores con clave propia cuya lista falló. */
export function failingOwnProviders(status: OwnCatalogStatus | null | undefined): string[] {
  return Object.entries(status ?? {})
    .filter(([, entry]) => entry.state === "error")
    .map(([id]) => id);
}

/** Proveedores con clave propia (conectados o con error). */
export function ownKeyProviders(status: OwnCatalogStatus | null | undefined): Set<string> {
  return new Set(
    Object.entries(status ?? {})
      .filter(([, entry]) => entry.state !== "not_connected")
      .map(([id]) => id),
  );
}

/**
 * Los fallos del catálogo de plataforma que importan al usuario: donde usa su
 * propia clave, lo que cuenta es su lista, no la de la plataforma.
 */
export function platformStatusForUser(
  platform: CatalogStatus | null | undefined,
  own: OwnCatalogStatus | null | undefined,
): CatalogStatus | null {
  if (!platform) return null;
  const mine = ownKeyProviders(own);
  return Object.fromEntries(Object.entries(platform).filter(([id]) => !mine.has(id)));
}

const ERROR_TEXT: Record<string, string> = {
  invalid_key: "El proveedor rechazó tu clave. Puede estar mal copiada, caducada o revocada.",
  rate_limited:
    "El proveedor limitó las peticiones de tu cuenta. Vuelve a intentarlo en unos minutos.",
  unreachable: "El proveedor no respondió. Vuelve a intentarlo en unos minutos.",
};

/** Motivo del fallo, dicho para el usuario. */
export function ownKeyErrorText(code: string): string {
  return ERROR_TEXT[code] ?? "No pudimos obtener sus modelos. Vuelve a intentarlo en unos minutos.";
}

/** Etiqueta corta del fallo para la fila de la clave. */
export function ownKeyErrorLabel(code: string): string {
  return code === "invalid_key" ? "Clave no válida" : "Sin respuesta";
}

/** Si el fallo se arregla cambiando la clave (y no reintentando). */
export function isKeyProblem(code: string): boolean {
  return code === "invalid_key";
}

/** Si el proveedor no está dando su lista a este usuario (su clave o la plataforma). */
export function isProviderDownForUser(
  platform: CatalogStatus | null | undefined,
  own: OwnCatalogStatus | null | undefined,
  provider: string,
): boolean {
  const entry = own?.[provider];
  if (entry && entry.state !== "not_connected") return entry.state === "error";
  return failedProviders(platform).includes(provider);
}
