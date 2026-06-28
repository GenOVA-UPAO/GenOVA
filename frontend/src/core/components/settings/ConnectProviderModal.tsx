import { ArrowRight, Info } from '@phosphor-icons/react'
import { Button } from '@/core/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'

interface ConnectProviderModalProps {
  open: boolean
  onClose: () => void
  onSelectProvider: (provider: string) => void
}

const PROVIDERS = [
  {
    id: 'groq',
    label: 'Groq',
    desc: 'Modelos LLaMA y Qwen gratuitos — sin costo por token.',
    recommended: true,
    badge: 'Gratuito',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: '⚡',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    desc: 'Acceso a +300 modelos: Claude, GPT-4o, Gemini, DeepSeek y más.',
    recommended: true,
    badge: 'Recomendado',
    badgeColor: 'bg-primary/10 text-primary',
    icon: '◎',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    desc: 'Suscripción con modelos optimizados para generación de código.',
    recommended: false,
    icon: '◈',
  },
]

function ProviderCard({
  provider,
  onSelect,
}: {
  provider: (typeof PROVIDERS)[number]
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider.id)}
      className="w-full flex items-start gap-3.5 rounded-xl px-4 py-3.5 text-left
        border border-border/50 hover:border-primary/40 hover:bg-primary/[.025]
        transition duration-150 group"
    >
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
        border border-border/60 bg-muted/50 text-base font-bold text-muted-foreground
        group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary transition"
      >
        {provider.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-foreground">
            {provider.label}
          </span>
          {provider.badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${provider.badgeColor}`}
            >
              {provider.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {provider.desc}
        </p>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 mt-1 text-muted-foreground/30 group-hover:text-primary transition-colors"
      />
    </button>
  )
}

export function ConnectProviderModal({
  open,
  onClose,
  onSelectProvider,
}: ConnectProviderModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-border/60 bg-muted/20">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Conectar proveedor
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground mt-1">
              Selecciona un proveedor para añadir tu API key.
            </p>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-2.5">
          {PROVIDERS.map((p) => (
            <ProviderCard key={p.id} provider={p} onSelect={onSelectProvider} />
          ))}
        </div>

        <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
          <Info
            size={13}
            className="shrink-0 mt-0.5 text-muted-foreground/60"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Para acceder a modelos de{' '}
            <span className="font-semibold text-foreground">
              Anthropic, OpenAI, Google, Mistral
            </span>{' '}
            y más — conecta{' '}
            <span className="font-semibold text-foreground">OpenRouter</span>{' '}
            con tu cuenta.
          </p>
        </div>

        <div className="px-4 pb-4 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-muted-foreground"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
