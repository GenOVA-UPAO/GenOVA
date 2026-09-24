import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface Props {
  /** Código HTTP del fallo (0 si no hubo respuesta). */
  status: number;
  message: string;
  onRetry: () => void;
}

function copyFor(status: number, message: string): { title: string; description: string } {
  if (status === 404) {
    return {
      title: "No encontramos este OVA",
      description: "Puede que se haya movido a la papelera o que el enlace no sea correcto.",
    };
  }
  if (status === 403) {
    return {
      title: "No tienes acceso a este OVA",
      description: "Solo la persona que lo creó puede abrirlo en el editor.",
    };
  }
  return { title: "No se pudo abrir el OVA", description: message };
}

/**
 * El OVA no se pudo abrir: explica qué pasó y ofrece lo que sirve. Reintentar
 * solo tiene sentido si el fallo puede ser pasajero (red o servidor), no si el
 * OVA no existe o no es tuyo.
 */
export function WorkspaceLoadError({ status, message, onRetry }: Readonly<Props>) {
  const permanent = status === 404 || status === 403;
  const copy = copyFor(status, message);
  return (
    <div role="alert" className="mx-auto w-full max-w-xl p-6">
      <EmptyState
        icon="warning-circle"
        tone="danger"
        title={copy.title}
        description={copy.description}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {status === 404 && (
              <Button variant="outline" asChild>
                <Link to="/papelera">Ver la papelera</Link>
              </Button>
            )}
            <Button variant={permanent ? "default" : "outline"} asChild>
              <Link to="/mis-ovas">Volver a Mis OVAs</Link>
            </Button>
            {!permanent && <Button onClick={onRetry}>Reintentar</Button>}
          </div>
        }
      />
    </div>
  );
}
