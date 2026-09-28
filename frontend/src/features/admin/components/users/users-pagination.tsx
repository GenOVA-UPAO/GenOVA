import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface UsersPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function UsersPagination({
  page,
  totalPages,
  onPageChange,
}: Readonly<UsersPaginationProps>) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginación de usuarios" className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="max-md:h-11"
          disabled={page === 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          <Icon name="caret-left" size="text-sm" /> Anterior
        </Button>
        <Button
          variant="outline"
          className="max-md:h-11"
          disabled={page === totalPages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Siguiente <Icon name="caret-right" size="text-sm" />
        </Button>
      </div>
    </nav>
  );
}
