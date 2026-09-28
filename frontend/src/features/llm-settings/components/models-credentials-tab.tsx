import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { UserApiKeysCard } from "./user-api-keys-card";

/**
 * Credenciales. Para el admin lo principal son las claves de la plataforma (con
 * ellas generan quienes no tienen clave propia): van primero, y sus claves
 * personales después, como algo opcional.
 */
export function ModelsCredentialsTab({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  const store = useLlmSettings();
  const personal = (
    <section className="space-y-4" aria-labelledby="claves-personales">
      <div>
        <h2 id="claves-personales" className="text-base font-semibold text-foreground">
          {isAdmin ? "Tus claves personales" : "Tus claves"}
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          {isAdmin
            ? "Opcionales. Solo se usan en los OVAs que generas tú, en lugar de las de la plataforma, y se pagan con tu cuenta."
            : "Con tu clave de un proveedor puedes elegir tus propios modelos, que se pagan con tu cuenta. Donde no pongas la tuya, se usa la de la plataforma."}
        </p>
      </div>
      <UserApiKeysCard ownStatus={store.ownCatalogStatus} />
    </section>
  );
  return (
    <div className="max-w-4xl space-y-10">
      {isAdmin ? <PlatformApiKeysCard /> : null}
      {personal}
    </div>
  );
}
