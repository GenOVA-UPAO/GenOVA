import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdminNodesConfig,
  saveAdminNodesConfig,
} from '../../services/ovaSettingsService.js'

const NODES_KEY = ['admin', 'nodes-config']

/**
 * Admin config for Prometheus nodes/agents.
 * Provides node definitions, current flag values, and a save mutation.
 */
export function useAdminNodesConfig() {
  const qc = useQueryClient()

  const config = useQuery({ queryKey: NODES_KEY, queryFn: getAdminNodesConfig })

  const save = useMutation({
    mutationFn: saveAdminNodesConfig,
    onSuccess: (data) => qc.setQueryData(NODES_KEY, data),
  })

  return { config, save }
}
