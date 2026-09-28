import { QueryClient } from "@tanstack/react-query";

import { HttpError } from "./http";

/**
 * Shared cache: lists/details stay fresh for 30s so moving between pages
 * doesn't refetch; 4xx responses are never retried (they won't change).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error) =>
        count < 2 && !(error instanceof HttpError && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
});
