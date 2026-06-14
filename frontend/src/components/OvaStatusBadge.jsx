import { StateBadge } from '@/components/ui/StateBadge'

const STATUS_LABELS = {
  borrador: 'Borrador',
  generando: 'Generando',
  listo: 'Listo',
  error: 'Error',
}

// Mapea el estado del OVA a un estado semántico on-brand (tokens UPAO):
// generando = naranja (en progreso), listo = azul (logrado), error = destructive.
const STATUS_TO_STATE = {
  borrador: 'neutral',
  generando: 'warning',
  listo: 'success',
  error: 'error',
}

export function OvaStatusBadge({ status }) {
  return (
    <StateBadge status={STATUS_TO_STATE[status] || 'neutral'}>
      {STATUS_LABELS[status] || status}
    </StateBadge>
  )
}
