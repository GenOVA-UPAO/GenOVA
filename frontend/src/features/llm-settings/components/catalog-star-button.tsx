import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

interface StarButtonProps {
  name: string;
  base: boolean;
  favorite: boolean;
  onToggle: () => void;
}

/** Estrella de favorito de una fila del catálogo; los modelos base la tienen fija. */
export function CatalogStarButton({ name, base, favorite, onToggle }: Readonly<StarButtonProps>) {
  const label = favorite ? `Quitar ${name} de favoritos` : `Añadir ${name} a favoritos`;
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={base ? `${name}: modelo base, siempre en favoritos` : label}
      title={base ? "Los modelos base siempre están en favoritos" : label}
      disabled={base}
      onClick={onToggle}
      className={cn(
        "-my-1.5 -ml-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default sm:size-9",
        favorite
          ? "text-accent-brand"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        !base && favorite && "hover:bg-accent-brand/10",
      )}
    >
      <Icon name="star" weight={favorite ? "fill" : "regular"} size="text-lg" />
    </button>
  );
}
