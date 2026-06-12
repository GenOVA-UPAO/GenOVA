import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function PricingBadge({ provider, pricing }) {
  if (provider === 'opencode') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        Go incluido
      </span>
    )
  }
  if (!pricing || pricing === 'Gratuito') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
        Gratuito
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">{pricing}</span>
}

export function ProviderModelsPanel({ provider, models, loading }) {
  const [open, setOpen] = useState(false)

  if (loading) {
    return (
      <div className="mt-2 space-y-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (!models?.length) return null

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Ocultar modelos' : `Ver modelos (${models.length})`}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Modelo</th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Contexto</th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {models.map((m) => (
                <tr key={m.model_id} className="hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-medium text-foreground max-w-[200px] truncate">
                    {m.label}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                    {m.context_length ? `${Math.round(m.context_length / 1000)}k` : '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    <PricingBadge provider={provider} pricing={m.pricing} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
