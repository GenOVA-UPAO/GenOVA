import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const error = useRouteError();
  const chunk = isChunkLoadError(error);
  if (!isRouteErrorResponse(error)) captureException(error);

  return (
    <main className="flex h-dvh overflow-y-auto flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">
        {chunk ? t("shell:hay_una_version_nueva") : t("shell:algo_salio_mal")}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {chunk
          ? t("shell:routeError.updateHint")
          : t("shell:routeError.unexpectedHint")}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={() => {
            location.reload();
          }}
        >
          {t("shell:recargar")} </Button>
        {!chunk && (
          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">{t("shell:volver_al_inicio")}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
