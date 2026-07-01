// Datos estáticos, variantes de animación y tarjetas del Dashboard.
// Extraído de DashboardPage para mantener archivos ≤200 líneas.
import { ShieldCheck, Users } from '@phosphor-icons/react'
import type { Variants } from 'motion/react'

export interface AdminCard {
  to: string
  icon: typeof ShieldCheck
  title: string
  desc: string
}

export const ADMIN_CARDS: AdminCard[] = [
  {
    to: '/admin/roles',
    icon: ShieldCheck,
    title: 'Roles',
    desc: 'Permisos y perfiles del sistema.',
  },
  
  {
    to: '/admin/users',
    icon: Users,
    title: 'Usuarios',
    desc: 'Cuentas, estado y rol activo.',
  },
]

export const STATUS_STYLE: Record<string, string> = {
  listo:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  generando:
    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  borrador:
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  error: 'bg-destructive/15 text-destructive border border-destructive/20',
}

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

export function formatDate(value: string | undefined): string {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
