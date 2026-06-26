import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from '@/features/analytics/services/analyticsService'

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
    staleTime: 60_000,
    retry: (count, error) => error?.code !== 'forbidden' && count < 2,
  })
}
