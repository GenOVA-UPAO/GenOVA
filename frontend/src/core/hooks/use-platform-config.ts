import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPlatformConfig,
  type PlatformConfigResponse,
  savePlatformConfigKey,
} from "@/core/services/platform-settings.api";

export const platformConfigKey = ["platform-config"] as const;

/** Claves de plataforma. `enabled: false` para quien no es admin (el endpoint le daría 403). */
export function usePlatformConfig(enabled = true) {
  return useQuery({ queryKey: platformConfigKey, queryFn: getPlatformConfig, enabled });
}

interface SaveKeyInput {
  provider: string;
  key: string;
}

/** Guarda (o borra con `key: ""`) la API key de un proveedor y refresca la caché. */
export function useSavePlatformKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: SaveKeyInput) => savePlatformConfigKey(provider, key),
    onSuccess: (result) => {
      queryClient.setQueryData<PlatformConfigResponse>(platformConfigKey, (prev) => ({
        ...prev,
        platform_config: result.platform_config ?? {},
      }));
    },
  });
}
