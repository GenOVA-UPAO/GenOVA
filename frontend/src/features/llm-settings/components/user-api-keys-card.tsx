import { PROVIDER_META } from "@/core/components/platform-key-meta";
import { QueryErrorState } from "@/core/components/query-error-state";
import { Skeleton } from "@/core/components/ui/skeleton";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";
import { UserKeyProviderGroup } from "./user-key-provider-group";

const LLM_PROVIDERS = ["groq", "openrouter", "opencode"];
const IMG_PROVIDERS = ["siliconflow", "runware", "falai"];

/** Claves API propias del usuario, agrupadas por tipo de proveedor. */
export function UserApiKeysCard() {
  const { apiKeys, loading, error, refetch } = useUserApiKeys();
  const llm = LLM_PROVIDERS.filter((id) => Object.hasOwn(PROVIDER_META, id));
  const img = IMG_PROVIDERS.filter((id) => Object.hasOwn(PROVIDER_META, id));
  const errText = error ? errorMessage(error, "No se pudieron cargar tus claves.") : null;

  if (loading) {
    return (
      // Con la forma de la lista final (título del grupo y filas con su botón).
      <div className="space-y-2" role="status" aria-busy="true" aria-label="Cargando claves">
        <Skeleton className="h-4 w-32" />
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {["a", "b", "c"].map((key) => (
            <div key={key} className="flex items-center gap-4 px-4 py-3.5">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errText) return <QueryErrorState title={errText} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <UserKeyProviderGroup title="Modelos de texto" providers={llm} apiKeys={apiKeys} />
      <UserKeyProviderGroup title="Imagen y video" providers={img} apiKeys={apiKeys} />
    </div>
  );
}
