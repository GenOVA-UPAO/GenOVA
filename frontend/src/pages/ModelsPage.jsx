import { Link } from 'react-router'
import { GearSix, Key, SlidersHorizontal } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { LlmSettingsCard } from '../components/settings/LlmSettingsCard.jsx'

export function ModelsPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-brand">
            Configuracion IA
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Modelos de IA
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Guarda modelos del catalogo y asigna cual usa GenOVA para texto, codigo,
            orquestacion y razonamiento.
          </p>
        </div>
        <Button asChild variant="outline" className="self-start gap-2">
          <Link to="/profile"><Key size={16} weight="duotone" /> API Keys</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Catalogo vivo', 'OpenRouter/Groq con estado y busqueda.', GearSix],
          ['Asignacion por tarea', 'Cada tipo de trabajo usa su modelo.', SlidersHorizontal],
          ['Control personal', 'Tus claves desbloquean configuracion propia.', Key],
        ].map(([title, text, Icon]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4">
            <Icon size={20} weight="duotone" className="text-primary" />
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <LlmSettingsCard />
    </section>
  )
}
