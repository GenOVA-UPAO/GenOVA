import { isRouteErrorResponse, Link, useRouteError } from "react-router";

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
    <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">
        {chunk ? "Hay una versión nueva" : "Algo salió mal"}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {chunk
          ? "La aplicación se actualizó mientras la tenías abierta. Recarga para continuar."
          : "Ocurrió un error inesperado. Puedes recargar la página o volver al inicio."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            location.reload();
          }}
          className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Recargar
        </button>
        {!chunk && (
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Volver al inicio
          </Link>
        )}
      </div>
    </main>
  );
}
