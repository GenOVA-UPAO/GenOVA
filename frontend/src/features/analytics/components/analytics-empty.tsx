import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface AnalyticsEmptyProps {
  onRetry: () => void;
}

/** Vacío cuando la query de analítica no devolvió datos. */
export function AnalyticsEmpty({ onRetry }: Readonly<AnalyticsEmptyProps>) {
  return (
    <EmptyState
      icon="magnifying-glass-minus"
      title="Aún no hay analíticas"
      description="No recibimos métricas. Inténtalo de nuevo en unos momentos."
      action={
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
}
