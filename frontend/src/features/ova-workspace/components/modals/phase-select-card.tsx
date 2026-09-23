import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import type { Resource } from "../../lib/ova-types";
import { resourceIconName } from "../../lib/resource-icons";

interface Props {
  resource: Resource;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onOpenPreview: () => void;
  onConfigure: () => void;
}

/**
 * Tarjeta seleccionable: el botón invisible cubre toda la tarjeta (aria-pressed)
 * y las acciones secundarias quedan por encima con `pointer-events-auto`.
 */
export function PhaseSelectCard({ resource, selected, disabled, onSelect, onPreview, onOpenPreview, onConfigure }: Readonly<Props>) {
  const title = resource.tipo ?? String(resource.id);
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-xl border bg-card transition-colors duration-150",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
        disabled && "opacity-60",
      )}
    >
      <button
        type="button"
        aria-label={`Seleccionar ${title}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
        onFocus={onPreview}
        onMouseEnter={onPreview}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
      />
      <div className="pointer-events-none flex flex-1 items-start gap-3 p-4 pb-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name={resourceIconName(resource.tipo)} className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-sm leading-snug font-semibold" title={title}>{title}</h4>
          {resource.interactividad && <p className="text-xs text-muted-foreground">Interactividad {resource.interactividad.toLowerCase()}</p>}
          {disabled && <p className="text-xs text-muted-foreground">Límite de la fase alcanzado</p>}
        </div>
        <Icon
          name={selected ? "check-circle" : "circle"}
          weight={selected ? "fill" : "regular"}
          className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground/60")}
        />
      </div>
      <div className="pointer-events-none flex flex-wrap items-center gap-1 px-3 pb-3">
        <Button className="pointer-events-auto relative" size="sm" variant="ghost" onClick={onConfigure} aria-label={`Configurar ${title}`}>
          <Icon name="sliders-horizontal" />
          Configurar
        </Button>
        <Button className="pointer-events-auto relative lg:hidden" size="sm" variant="ghost" onClick={onOpenPreview} aria-label={`Vista previa ${title}`}>
          <Icon name="eye" />
          Vista previa
        </Button>
      </div>
    </article>
  );
}
