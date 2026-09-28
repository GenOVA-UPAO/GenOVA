import { useIsAdmin } from "@/core/auth/auth-store";

import { useUserApiKeys } from "./use-user-api-keys";

/**
 * Proveedores cuyos modelos puede elegir el usuario: los que tienen su propia
 * clave, porque lo que elige se paga con ella (el backend rechaza el resto).
 * `null` = sin restricción (el admin ya trabaja con las claves de la plataforma).
 */
export function useOwnKeyProviders(): Set<string> | null {
  const isAdmin = useIsAdmin();
  const { apiKeys, loading } = useUserApiKeys();
  // Mientras cargan las claves no se filtra: el backend rechaza igual lo no permitido.
  if (isAdmin || loading) return null;
  return new Set(Object.entries(apiKeys).filter(([, masked]) => Boolean(masked)).map(([p]) => p));
}

export function isAllowedProvider(allowed: Set<string> | null, provider: string): boolean {
  return allowed === null || allowed.has(provider);
}

/**
 * Modelos elegibles por el usuario: solo los de proveedores con su clave. Los
 * inactivos no: con la clave rechazada el catálogo trae los de la plataforma
 * solo para poner nombre y precio a los que ya usa la configuración.
 */
export function useOwnKeyModels<T extends { provider: string; active?: boolean }>(
  models: readonly T[],
): T[] {
  const allowed = useOwnKeyProviders();
  return models.filter(
    (model) => model.active !== false && isAllowedProvider(allowed, model.provider),
  );
}
