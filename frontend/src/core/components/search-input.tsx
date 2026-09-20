import { Icon } from "@/core/components/icon";
import { Input } from "@/core/components/ui/input";
import { cn } from "@/core/lib/cn";

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Clases extra del input; ganan en conflicto a las base. */
  inputClassName?: string;
  className?: string;
}

/**
 * Campo de búsqueda canónico: lupa a la izquierda (por encima del input, así
 * no queda tapada) y botón "Limpiar búsqueda" visible solo con texto.
 */
export function SearchInput({
  value,
  onValueChange,
  placeholder = "Buscar...",
  ariaLabel = "Buscar",
  inputClassName,
  className,
}: Readonly<SearchInputProps>) {
  return (
    <div className={cn("relative", className)}>
      <Icon
        name="magnifying-glass"
        size="text-lg"
        className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          onValueChange(e.target.value);
        }}
        className={cn(
          "w-full pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
          }}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2.5 z-10 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Icon name="x" size="text-base" />
        </button>
      )}
    </div>
  );
}
