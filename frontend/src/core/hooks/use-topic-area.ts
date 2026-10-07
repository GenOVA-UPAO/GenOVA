import { useQuery } from "@tanstack/react-query";

import { getTopicArea } from "@/core/services/platform-settings.api";

export const topicAreaKey = ["topic-area"] as const;

/** Área temática activa ("" si no hay o aún no se sabe). Un fallo nunca bloquea la creación. */
export function useTopicArea(): string {
  const { data } = useQuery({
    queryKey: topicAreaKey,
    queryFn: getTopicArea,
    staleTime: 60_000,
    retry: false,
  });
  return data?.area.trim() ?? "";
}
