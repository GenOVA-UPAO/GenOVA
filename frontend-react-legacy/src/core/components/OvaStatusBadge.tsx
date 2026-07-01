import { StateBadge } from '@/core/components/ui/StateBadge'

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  generando: 'Generando',
  listo: 'Listo',
  error: 'Error',
}

const STATUS_TO_STATE: Record<
  string,
  'neutral' | 'warning' | 'success' | 'error'
> = {
  borrador: 'neutral',
  generando: 'warning',
  listo: 'success',
  error: 'error',
}

interface OvaStatusBadgeProps {
  status?: string
}

export function OvaStatusBadge({ status }: OvaStatusBadgeProps) {
  return (
    <StateBadge status={STATUS_TO_STATE[status ?? ''] || 'neutral'}>
      {STATUS_LABELS[status ?? ''] || status}
    </StateBadge>
  )
}
