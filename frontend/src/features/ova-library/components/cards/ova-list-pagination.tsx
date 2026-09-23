import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

interface OvaListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
}

/** Paginación anterior/siguiente para las listas de OVAs. */
export function OvaListPagination({
  currentPage,
  totalPages,
  onPageChange,
  label = "Paginación",
  className,
}: Readonly<OvaListPaginationProps>) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className={cn("flex items-center justify-between gap-3", className)}>
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        Página <span className="font-medium text-foreground">{currentPage}</span> de{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="max-sm:size-11 max-sm:px-0"
          onClick={() => {
            onPageChange(currentPage - 1);
          }}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
        >
          <Icon name="caret-left" size="text-base" />
          <span className="max-sm:sr-only">Anterior</span>
        </Button>
        <Button
          variant="outline"
          className="max-sm:size-11 max-sm:px-0"
          onClick={() => {
            onPageChange(currentPage + 1);
          }}
          disabled={currentPage >= totalPages}
          aria-label="Página siguiente"
        >
          <span className="max-sm:sr-only">Siguiente</span>
          <Icon name="caret-right" size="text-base" />
        </Button>
      </div>
    </nav>
  );
}
