import { Link } from 'react-router'
import { Key, SlidersHorizontal, GearSix } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { LlmSettingsCard } from '../components/settings/LlmSettingsCard.jsx'

export function ModelsPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 pb-10"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl flex items-center gap-3">
            <SlidersHorizontal className="text-primary" weight="duotone" />
            Modelos de IA
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium text-muted-foreground">
            Guarda modelos del catálogo y asígnalos a cada tarea de generación en GenOVA.
          </p>
        </div>
        <Button asChild variant="outline" className="self-start gap-2 shadow-sm border-primary/20 hover:bg-primary/5 text-primary">
          <Link to="/profile"><Key size={16} weight="duotone" /> API Keys Personales</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Catálogo vivo', 'Explora modelos con estado y búsqueda.', GearSix],
          ['Asignación por tarea', 'Cada agente usa un modelo específico.', SlidersHorizontal],
          ['Control personal', 'Usa tus propias API keys para más opciones.', Key],
        ].map(([title, text, Icon]) => (
          <div key={title} className="rounded-2xl border-2 border-border/40 bg-card p-5 glass-card shadow-sm hover:border-primary/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Icon size={20} weight="duotone" className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground font-medium">{text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <LlmSettingsCard />
    </motion.div>
  )
}
