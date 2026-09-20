import type { LoaderFunctionArgs } from "react-router";

import { requireAuth } from "@/core/auth/guards";
import { queryClient } from "@/core/lib/query-client";
import { ovaLibraryApi } from "@/features/ova-library/api/ova-library.api";
import { ovaKeys } from "@/features/ova-library/hooks/use-ova-library";

/**
 * Loader del dashboard: lanza la lista de OVAs en paralelo con la revalidación
 * de sesión, eliminando la cascada /auth/me → /api/ovas del arranque.
 * useQuery reutiliza la petición por query key, así que no hay doble fetch.
 */
export async function dashboardLoader(args: LoaderFunctionArgs) {
  void queryClient
    .query({
      queryKey: ovaKeys.list({ page: 1 }),
      queryFn: () => ovaLibraryApi.list({ page: 1 }),
    })
    .catch(() => undefined);
  return requireAuth(args);
}
