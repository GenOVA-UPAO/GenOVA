import { useQuery } from "@tanstack/react-query";

import { fetchOvaJobByOvaId } from "../api/ova-jobs.api";

/**
 * Último job de generación del OVA. La misma clave que usa el panel de
 * generación: el aviso de fallidos y las fases del editor comparten la
 * petición. Un OVA sin job (duplicado, importado) responde 404: sin reintentos.
 */
export function useOvaLatestJob(ovaId: string, enabled = true) {
  return useQuery({
    queryKey: ["ova-job-by-ova", ovaId],
    queryFn: () => fetchOvaJobByOvaId(ovaId),
    retry: false,
    enabled,
  });
}
