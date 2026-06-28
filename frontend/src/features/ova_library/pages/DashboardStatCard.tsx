// Tarjeta de estadística del Dashboard. Separada de los datos (helpers) para
// cumplir useComponentExportOnlyModules (un módulo = solo componentes).
import { m as motion } from 'motion/react'
import { itemVariants } from '@/features/ova_library/pages/DashboardPage.helpers'

interface StatCardProps {
  label: string
  value: number
  sub: string
  tone: string
}

export function StatCard({ label, value, sub, tone }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className="glass-card rounded-2xl p-6 transition"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-3 text-5xl font-display font-semibold tracking-tight ${tone}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{sub}</p>
    </motion.div>
  )
}
