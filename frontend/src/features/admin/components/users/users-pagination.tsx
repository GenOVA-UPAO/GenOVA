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
    <div className="flex flex-col items-center justify-between gap-3 px-2 sm:flex-row">
      <p className="rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        Página <span className="font-bold text-foreground">{page}</span> de{" "}
        <span className="font-bold text-foreground">{totalPages}</span>
      </p>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          variant="outline"
          className="flex-1 rounded-xl border-border/50 shadow-sm sm:flex-none"
          disabled={page === 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          ← Anterior
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-xl border-border/50 shadow-sm sm:flex-none"
          disabled={page === totalPages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Siguiente →
        </Button>
      </div>
    </div>
  );
}
