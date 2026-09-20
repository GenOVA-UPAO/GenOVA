import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface QueryErrorStateProps {
  title: string;
  onRetry: () => void;
}

/** Error de carga con mensaje en español y Reintentar (refetch). */
export function QueryErrorState({ title, onRetry }: Readonly<QueryErrorStateProps>) {
  return (
    <div role="alert">
      <EmptyState
        icon="warning-circle"
        title={title}
        description="Comprueba tu conexión e inténtalo de nuevo."
        action={
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
