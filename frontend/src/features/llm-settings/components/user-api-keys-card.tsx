import { PROVIDER_META } from "@/core/components/platform-key-meta";
import { Skeleton } from "@/core/components/ui/skeleton";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";
import { UserKeyProviderGroup } from "./user-key-provider-group";

const LLM_PROVIDERS = ["groq", "openrouter", "opencode"];
const IMG_PROVIDERS = ["siliconflow", "runware", "falai"];

/** Claves API propias del usuario, agrupadas por tipo de proveedor. */
export function UserApiKeysCard() {
  const { apiKeys, loading, error } = useUserApiKeys();
  const llm = LLM_PROVIDERS.filter((id) => Object.hasOwn(PROVIDER_META, id));
  const img = IMG_PROVIDERS.filter((id) => Object.hasOwn(PROVIDER_META, id));
  const errText = error ? errorMessage(error, "No se pudieron cargar tus claves.") : null;

  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-busy="true" aria-label="Cargando claves">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (errText) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {errText}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <UserKeyProviderGroup title="Modelos de texto" providers={llm} apiKeys={apiKeys} />
      <UserKeyProviderGroup title="Imagen y video" providers={img} apiKeys={apiKeys} />
    </div>
  );
}
