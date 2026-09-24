import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { UserApiKeysCard } from "./user-api-keys-card";

export function ModelsCredentialsTab({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  const store = useLlmSettings();
  return (
    <div className="max-w-4xl space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Tus claves</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Con tu clave de un proveedor puedes elegir tus propios modelos, que se pagan con tu
            cuenta. Donde no pongas la tuya, se usa la de la plataforma.
          </p>
        </div>
        <UserApiKeysCard ownStatus={store.ownCatalogStatus} />
      </section>
      {isAdmin ? <PlatformApiKeysCard /> : null}
    </div>
  );
}
