import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

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

export function PhaseSelectCard({ resource, selected, disabled, onSelect, onPreview, onOpenPreview, onConfigure }: Readonly<Props>) {
  const title = resource.tipo ?? String(resource.id);
  return (
    <article className={`relative flex flex-col rounded-xl border-2 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
      <button
        type="button"
        aria-label={`Seleccionar ${title}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
        onFocus={onPreview}
        onMouseEnter={onPreview}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <div className="pointer-events-none flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name={resourceIconName(resource.tipo)} size="text-2xl" />
          </span>
          <span className={`flex items-center gap-1 text-xs font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}>
            <Icon name={selected ? "check-circle" : "circle"} size="text-lg" weight={selected ? "fill" : "regular"} />
            {selected ? "Seleccionado" : "Sin seleccionar"}
          </span>
        </div>
        <h3 className="font-display text-sm font-semibold leading-snug" title={title}>{title}</h3>
        {resource.interactividad && <p className="w-fit rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Interactividad: {resource.interactividad}</p>}
        {disabled && <p className="text-xs text-muted-foreground">Límite de esta fase alcanzado</p>}
      </div>
      <div className="pointer-events-none flex flex-wrap items-center gap-1 px-3 pb-3">
        <Button className="pointer-events-auto relative" size="sm" variant="outline" onClick={onConfigure} aria-label={`Configurar ${title}`}>
          <Icon name="gear" /> Configurar
        </Button>
        <Button className="pointer-events-auto relative text-xs text-muted-foreground" size="sm" variant="ghost" onClick={onOpenPreview} aria-label={`Vista previa ${title}`}>
          Vista previa
        </Button>
      </div>
    </article>
  );
}
