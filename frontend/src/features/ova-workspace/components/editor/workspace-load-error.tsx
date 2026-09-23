import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

/** El OVA no se pudo abrir: explica qué pasó y ofrece reintentar o volver. */
export function WorkspaceLoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <div role="alert" className="mx-auto w-full max-w-xl p-6">
      <EmptyState
        icon="warning-circle"
        tone="danger"
        title="No se pudo abrir el OVA"
        description={message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/mis-ovas">Volver a Mis OVAs</Link>
            </Button>
            <Button onClick={onRetry}>Reintentar</Button>
          </div>
        }
      />
    </div>
  );
}
