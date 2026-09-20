import { Button } from "@/core/components/ui/button";

interface OvaListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Paginación uniforme para las listas de OVAs. */
export function OvaListPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: Readonly<OvaListPaginationProps>) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex items-center justify-between border-t border-border px-1 pt-4 ${className ?? ""}`}
    >
      <p className="text-xs font-medium text-muted-foreground">
        Página <span className="font-bold text-foreground">{currentPage}</span> de{" "}
        <span className="font-bold text-foreground">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onPageChange(currentPage - 1);
          }}
          disabled={currentPage <= 1}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onPageChange(currentPage + 1);
          }}
          disabled={currentPage >= totalPages}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
