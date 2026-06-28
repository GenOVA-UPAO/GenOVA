// Barra de búsqueda + filtro por categoría del modal de gestión de modelos.
// Extraído de ManageModelsModal para mantener archivos ≤200 líneas.
import { MagnifyingGlass } from '@phosphor-icons/react'
import { startTransition } from 'react'
import { CATEGORY_LABELS } from '@/core/lib/llm/llmSettingsLabels'

interface ManageModelsToolbarProps {
  localSearch: string
  onSearch: (value: string) => void
  categoryFilter: string
  categories: string[]
  onCategory: (value: string) => void
}

export function ManageModelsToolbar({
  localSearch,
  onSearch,
  categoryFilter,
  categories,
  onCategory,
}: ManageModelsToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-background">
      <div className="relative flex-1">
        <MagnifyingGlass
          size={13}
          weight="duotone"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <input
          type="text"
          placeholder="Buscar modelo..."
          value={localSearch}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/60 bg-muted/30
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40
            placeholder:text-muted-foreground/40 transition"
        />
      </div>
      <select
        value={categoryFilter || 'all'}
        onChange={(e) => startTransition(() => onCategory(e.target.value))}
        className="text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5
          focus:outline-none focus:ring-2 focus:ring-primary/20 text-muted-foreground transition cursor-pointer"
      >
        {(categories || []).map((cat: string) => (
          <option key={cat} value={cat}>
            {CATEGORY_LABELS[cat] || cat}
          </option>
        ))}
      </select>
    </div>
  )
}
