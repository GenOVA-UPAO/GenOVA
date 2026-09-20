import { PROVIDER_META } from "@/core/components/platform-key-meta";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";
import { UserKeyRow } from "./user-key-row";

const LLM_PROVIDERS = ["groq", "openrouter", "opencode"];
const IMG_PROVIDERS = ["siliconflow", "runware", "falai"];

export function UserApiKeysCard({ compact = false }: Readonly<{ compact?: boolean }>) {
  const { apiKeys, loading, error } = useUserApiKeys();
  const llm = LLM_PROVIDERS.filter((id) => Object.hasOwn(PROVIDER_META, id));
  const img = IMG_PROVIDERS.filter((id) => Object.hasOwn(PROVIDER_META, id));
  const errText = error ? errorMessage(error, "No se pudo cargar.") : null;

  return (
    <section
      className={
        compact
          ? "space-y-4 rounded-xl border border-border bg-background p-4 shadow-sm"
          : "space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm"
      }
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Mis API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Tus keys tienen prioridad sobre las de la plataforma. Déjalas vacías para usar las
          predeterminadas.
        </p>
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : null}
      {errText ? <p className="text-sm text-destructive">{errText}</p> : null}
      {!loading && !errText ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">LLM</h3>
            {llm.map((id) => (
              <UserKeyRow key={id} provider={id} maskedValue={apiKeys[id]} />
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Imagen / video
            </h3>
            {img.map((id) => (
              <UserKeyRow key={id} provider={id} maskedValue={apiKeys[id]} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
