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
  return (
    <section
      aria-labelledby="lti-tool-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 id="lti-tool-title" className="font-display text-xl font-semibold">
        Datos de GenOVA para el LMS
      </h2>
      <p className="mt-1 max-w-[68ch] text-sm text-pretty text-muted-foreground">
        Pégalos al añadir GenOVA como herramienta externa LTI 1.3 en Moodle, Canvas o Blackboard.
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
              Estas URLs salen de la dirección con la que entraste. En producción, define
              LTI_TOOL_URL en el backend con su dirección pública.
            </p>
          )}
          <dl className="mt-2 divide-y divide-border">
            <ToolRow
              label="URL de inicio de sesión"
              hint="Initiate login URL"
              value={tool.login_url}
            />
            <ToolRow
              label="URL de redirección y de la herramienta"
              hint="Redirection URI, Tool URL y Deep Linking"
              value={tool.launch_url}
            />
            <ToolRow
              label="URL del conjunto de claves"
              hint="Public keyset URL (JWKS)"
              value={tool.jwks_url}
            />
          </dl>
        </>
      )}
    </section>
  );
}
