import { QueryClient } from '@tanstack/react-query'

// Instancia única de TanStack Query para toda la app. Defaults conservadores:
// caché 30s, 1 reintento, sin refetch al enfocar la ventana (se opta-in donde
// importe). Los queryFn reusan los services existentes (que llaman a lib/http).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
