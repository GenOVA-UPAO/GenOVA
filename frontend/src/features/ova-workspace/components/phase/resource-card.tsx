import { Button } from "@/core/components/ui/button";

import type { Resource } from "../../lib/ova-types";
import { resourceDisplayName } from "../../lib/resource-display-name";

interface Props {
  resource: Resource;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  onConfigure?: () => void;
}
export function ResourceCard({
  resource,
  selected,
  disabled,
  onSelect,
  onPreview,
  onConfigure,
}: Readonly<Props>) {
  const title = resourceDisplayName(resource.tipo ?? String(resource.id));
  return (
    <article
      className={`space-y-3 rounded-xl border p-4 ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"}`}
    >
      <button
        type="button"
        className="w-full text-left"
        disabled={disabled}
        aria-label={`Seleccionar ${title}`}
        aria-pressed={selected}
        onClick={onSelect}
        onMouseEnter={onPreview}
        onFocus={onPreview}
      >
        <h3 className="line-clamp-2 font-semibold" title={title}>
          {title}
        </h3>
        {resource.interactividad && (
          <p className="text-xs text-muted-foreground">
            Interactividad {resource.interactividad.toLowerCase()}
          </p>
        )}
      </button>
      <div className="flex flex-wrap gap-2">
        {onPreview && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onPreview}
            aria-label={`Vista previa ${title}`}
          >
            Vista previa
          </Button>
        )}
        {onConfigure && (
          <Button
            size="sm"
            variant="outline"
            onClick={onConfigure}
            aria-label={`Configurar ${title}`}
          >
            Configurar
          </Button>
        )}
      </div>
    </article>
  );
}
