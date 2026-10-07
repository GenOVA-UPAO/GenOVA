import { useTranslation } from "react-i18next";

import { Skeleton } from "@/core/components/ui/skeleton";

import type { LtiToolConfig } from "../../api/admin-lti.api";
import { ToolRow } from "./lti-tool-row";

interface LtiToolCardProps {
  tool: LtiToolConfig | undefined;
  isLoading: boolean;
  error: Error | null;
}

/** Datos de GenOVA que el administrador del LMS pega al registrar la herramienta. */
export function LtiToolCard({ tool, isLoading, error }: Readonly<LtiToolCardProps>) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="lti-tool-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 id="lti-tool-title" className="font-display text-xl font-semibold">
        {t("lti:toolTitle")}
      </h2>
      <p className="mt-1 max-w-[68ch] text-sm text-pretty text-muted-foreground">
        {t("lti:toolDescription")}
      </p>
      {isLoading && <Skeleton className="mt-4 h-40 w-full" />}
      {error !== null && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error.message}
        </p>
      )}
      {tool !== undefined && (
        <>
          {!tool.tool_url_configured && (
            <p role="note" className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
              {t("lti:toolUrlHint")}
            </p>
          )}
          <dl className="mt-2 divide-y divide-border">
            <ToolRow
              label={t("lti:loginUrl")}
              hint={t("lti:loginUrlHint")}
              value={tool.login_url}
            />
            <ToolRow
              label={t("lti:launchUrl")}
              hint={t("lti:launchUrlHint")}
              value={tool.launch_url}
            />
            <ToolRow
              label={t("lti:jwksUrl")}
              hint={t("lti:jwksUrlHint")}
              value={tool.jwks_url}
            />
          </dl>
        </>
      )}
    </section>
  );
}
