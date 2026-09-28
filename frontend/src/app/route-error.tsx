import { isRouteErrorResponse, Link, useRouteError } from "react-router";

import { Button } from "@/core/components/ui/button";
import { captureException } from "@/core/lib/observability/sentry";

/** A deploy replaced the hashed chunks while this tab was open. */
function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      error.message,
    )
  );
}

export function RouteError() {
  const error = useRouteError();
  const chunk = isChunkLoadError(error);
  if (!isRouteErrorResponse(error)) captureException(error);

  return (
    <main className="flex h-dvh overflow-y-auto flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">
        {chunk ? "Hay una versión nueva" : "Algo salió mal"}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {chunk
          ? "La aplicación se actualizó mientras la tenías abierta. Recarga para continuar."
          : "Ocurrió un error inesperado. Recarga la página o vuelve al inicio."}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={() => {
            location.reload();
          }}
        >
          Recargar
        </Button>
        {!chunk && (
          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">Volver al inicio</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
