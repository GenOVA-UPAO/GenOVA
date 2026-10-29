import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useIsAdmin } from "@/core/auth/auth-store";
import { Button } from "@/core/components/ui/button";

import type { ResourceVM } from "../../lib/ova-job-view-model";

function failureHint(code?: string | null): string {
  if (code === "provider_auth_personal") return "workspace:providerAuthPersonal";
  return code ? "workspace:providerAuth" : "workspace:generationFailedHint";
}

/** Fallo total: qué pasó, qué se conserva y la única acción que lo arregla. */
export function TotalFailurePanel({
  viewModel,
  onRetryAll,
}: Readonly<{ viewModel: ResourceVM[]; onRetryAll: () => void }>) {
  const { t } = useTranslation();
  const isAdmin = useIsAdmin();
  const authCode = viewModel.find((r) => r.error_code?.startsWith("provider_auth"))?.error_code;
  const errorId = viewModel.find((resource) => resource.error_id)?.error_id;
  return (
    <section
      aria-labelledby="total-failure-title"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5"
    >
      <div>
        <h2 id="total-failure-title" className="font-semibold text-destructive">
          {t("workspace:no_se_pudo_generar_el_ova")} </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(failureHint(authCode))} </p>
        {authCode && isAdmin && (
          <Link className="text-sm text-primary underline" to="/models?tab=credentials">{t("workspace:providerCredentials")}</Link>
        )}
        {errorId && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("workspace:codigo_de_error")} <span className="font-mono">{errorId}</span>
          </p>
        )}
      </div>
      <Button className="max-sm:h-11 max-sm:w-full" onClick={onRetryAll}>
        {t("workspace:reintentar_generacion")} </Button>
    </section>
  );
}
